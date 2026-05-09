import { Response, AuthRequest } from 'express';
import pool from '../config/database';

// Get all groups with their layers (flat list with parent info)
export const getAllGroups = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT g.*, p.name as parent_name,
             (SELECT COUNT(*) FROM layers l WHERE l.group_id = g.id) as layer_count,
             (SELECT COUNT(*) FROM layer_groups cg WHERE cg.parent_id = g.id) as child_count
      FROM layer_groups g
      LEFT JOIN layer_groups p ON g.parent_id = p.id
      ORDER BY g.sort_order ASC, g.created_at ASC
    `);

    res.status(200).json({
      groups: result.rows
    });
  } catch (error: any) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get groups in tree structure
export const getGroupsTree = async (req: AuthRequest, res: Response) => {
  try {
    // Get all groups
    const groupsResult = await pool.query(`
      SELECT g.*, p.name as parent_name
      FROM layer_groups g
      LEFT JOIN layer_groups p ON g.parent_id = p.id
      ORDER BY g.sort_order ASC, g.created_at ASC
    `);

    // Get layer counts
    const layersCountResult = await pool.query(`
      SELECT group_id, COUNT(*) as count
      FROM layers
      WHERE group_id IS NOT NULL
      GROUP BY group_id
    `);

    const layerCounts: { [key: number]: number } = {};
    layersCountResult.rows.forEach(row => {
      layerCounts[row.group_id] = parseInt(row.count);
    });

    // Build tree structure
    const groups = groupsResult.rows;
    const rootGroups: any[] = [];

    // Create a map for quick lookup
    const groupMap: { [key: number]: any } = {};
    groups.forEach((g: any) => {
      groupMap[g.id] = {
        ...g,
        children: [],
        layer_count: layerCounts[g.id] || 0
      };
    });

    // Build tree
    groups.forEach((g: any) => {
      const group = groupMap[g.id];
      if (g.parent_id && groupMap[g.parent_id]) {
        groupMap[g.parent_id].children.push(group);
      } else {
        rootGroups.push(group);
      }
    });

    // Sort children by sort_order within each group
    const sortChildren = (groupList: any[]) => {
      groupList.forEach(group => {
        if (group.children?.length > 0) {
          group.children.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
          sortChildren(group.children);
        }
      });
    };
    sortChildren(rootGroups);

    // Sort root groups by sort_order
    rootGroups.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

    res.status(200).json({
      groups: rootGroups
    });
  } catch (error: any) {
    console.error('Get groups tree error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single group by ID
export const getGroupById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT g.*, p.name as parent_name FROM layer_groups g LEFT JOIN layer_groups p ON g.parent_id = p.id WHERE g.id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get layers in this group
    const layersResult = await pool.query(
      'SELECT id, geoserver_name, display_name, is_active, sort_order FROM layers WHERE group_id = $1 ORDER BY sort_order ASC',
      [id]
    );

    // Get child groups
    const childGroupsResult = await pool.query(
      'SELECT id, name, description, sort_order FROM layer_groups WHERE parent_id = $1 ORDER BY sort_order ASC',
      [id]
    );

    res.status(200).json({
      group: {
        ...result.rows[0],
        layers: layersResult.rows,
        children: childGroupsResult.rows
      }
    });
  } catch (error: any) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create group (admin only)
export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, parent_id, description, legend, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Validate parent_id if provided
    if (parent_id) {
      const parentExists = await pool.query('SELECT id FROM layer_groups WHERE id = $1', [parent_id]);
      if (parentExists.rows.length === 0) {
        return res.status(400).json({ error: 'Parent group not found' });
      }
    }

    const result = await pool.query(
      `INSERT INTO layer_groups (name, parent_id, description, legend, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, parent_id || null, description || null, legend ? JSON.stringify(legend) : null, sort_order || 0]
    );

    res.status(201).json({
      message: 'Group created successfully',
      group: result.rows[0]
    });
  } catch (error: any) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update group (admin only)
export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parent_id, description, legend, sort_order } = req.body;

    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT * FROM layer_groups WHERE id = $1',
      [groupId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Prevent making a group its own parent or creating cycles
    if (parent_id) {
      if (parent_id === groupId) {
        return res.status(400).json({ error: 'A group cannot be its own parent' });
      }

      // Check if parent exists and doesn't create a cycle
      const parentCheck = await pool.query('SELECT id, parent_id FROM layer_groups WHERE id = $1', [parent_id]);
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Parent group not found' });
      }

      // Simple cycle check: parent shouldn't have the current group as ancestor
      let currentParent = parentCheck.rows[0].parent_id;
      while (currentParent) {
        if (currentParent === groupId) {
          return res.status(400).json({ error: 'This would create a circular reference' });
        }
        const parentResult = await pool.query('SELECT parent_id FROM layer_groups WHERE id = $1', [currentParent]);
        currentParent = parentResult.rows[0]?.parent_id;
      }
    }

    const result = await pool.query(
      `UPDATE layer_groups
       SET name = COALESCE($1, name),
           parent_id = CASE WHEN $2::integer IS NULL THEN NULL ELSE COALESCE($2, parent_id) END,
           description = COALESCE($3, description),
           legend = COALESCE($4, legend),
           sort_order = COALESCE($5, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, parent_id === null ? null : (parent_id || undefined), description, legend ? JSON.stringify(legend) : undefined, sort_order, groupId]
    );

    res.status(200).json({
      message: 'Group updated successfully',
      group: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete group (admin only)
export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const groupId = parseInt(id);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT id FROM layer_groups WHERE id = $1',
      [groupId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Delete group (child groups will be deleted via CASCADE, layers will have group_id set to NULL)
    await pool.query('DELETE FROM layer_groups WHERE id = $1', [groupId]);

    res.status(200).json({
      message: 'Group deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { Response, AuthRequest } from 'express';
import pool from '../config/database';

// Get all layers with group info
export const getAllLayers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT l.*, g.name as group_name
      FROM layers l
      LEFT JOIN layer_groups g ON l.group_id = g.id
      ORDER BY g.sort_order ASC, l.sort_order ASC, l.created_at ASC
    `);

    res.status(200).json({
      layers: result.rows
    });
  } catch (error: any) {
    console.error('Get layers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single layer by ID
export const getLayerById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM layers WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }

    res.status(200).json({
      layer: result.rows[0]
    });
  } catch (error: any) {
    console.error('Get layer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get layer by geoserver_name
export const getLayerByName = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;

    const result = await pool.query(
      'SELECT * FROM layers WHERE geoserver_name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }

    res.status(200).json({
      layer: result.rows[0]
    });
  } catch (error: any) {
    console.error('Get layer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create layer (admin only)
export const createLayer = async (req: AuthRequest, res: Response) => {
  try {
    const { geoserver_name, display_name, group_id, file_path, class_labels, is_active, sort_order } = req.body;

    if (!geoserver_name) {
      return res.status(400).json({ error: 'geoserver_name is required' });
    }

    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM layers WHERE geoserver_name = $1',
      [geoserver_name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Layer already exists' });
    }

    // Validate group_id if provided
    if (group_id) {
      const groupExists = await pool.query('SELECT id FROM layer_groups WHERE id = $1', [group_id]);
      if (groupExists.rows.length === 0) {
        return res.status(400).json({ error: 'Group not found' });
      }
    }

    const result = await pool.query(
      `INSERT INTO layers (geoserver_name, display_name, group_id, file_path, class_labels, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        geoserver_name,
        display_name || geoserver_name,
        group_id || null,
        file_path || null,
        class_labels ? JSON.stringify(class_labels) : null,
        is_active !== undefined ? is_active : true,
        sort_order || 0
      ]
    );

    res.status(201).json({
      message: 'Layer created successfully',
      layer: result.rows[0]
    });
  } catch (error: any) {
    console.error('Create layer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update layer (admin only)
export const updateLayer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { geoserver_name, display_name, group_id, file_path, class_labels, is_active, sort_order } = req.body;

    const layerId = parseInt(id);
    if (isNaN(layerId)) {
      return res.status(400).json({ error: 'Invalid layer ID' });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT * FROM layers WHERE id = $1',
      [layerId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }

    // Check if new name conflicts with another record
    if (geoserver_name) {
      const nameConflict = await pool.query(
        'SELECT id FROM layers WHERE geoserver_name = $1 AND id != $2',
        [geoserver_name, layerId]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(409).json({ error: 'Layer name already in use' });
      }
    }

    // Validate group_id if provided
    if (group_id !== undefined && group_id !== null) {
      const groupExists = await pool.query('SELECT id FROM layer_groups WHERE id = $1', [group_id]);
      if (groupExists.rows.length === 0) {
        return res.status(400).json({ error: 'Group not found' });
      }
    }

    const result = await pool.query(
      `UPDATE layers
       SET geoserver_name = COALESCE($1, geoserver_name),
           display_name = COALESCE($2, display_name),
           group_id = CASE WHEN $3::integer IS NULL THEN NULL ELSE COALESCE($3, group_id) END,
           file_path = COALESCE($4, file_path),
           class_labels = COALESCE($5, class_labels),
           is_active = COALESCE($6, is_active),
           sort_order = COALESCE($7, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        geoserver_name,
        display_name,
        group_id === null ? null : (group_id || undefined),
        file_path,
        class_labels ? JSON.stringify(class_labels) : undefined,
        is_active,
        sort_order,
        layerId
      ]
    );

    res.status(200).json({
      message: 'Layer updated successfully',
      layer: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update layer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete layer (admin only)
export const deleteLayer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const layerId = parseInt(id);
    if (isNaN(layerId)) {
      return res.status(400).json({ error: 'Invalid layer ID' });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT id FROM layers WHERE id = $1',
      [layerId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Layer not found' });
    }

    await pool.query('DELETE FROM layers WHERE id = $1', [layerId]);

    res.status(200).json({
      message: 'Layer deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete layer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

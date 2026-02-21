import { Response, AuthRequest } from 'express';
import pool from '../config/database';

// Get all layer metadata
export const getAllLayerMetadata = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM layer_metadata ORDER BY created_at DESC'
    );

    res.status(200).json({
      metadata: result.rows
    });
  } catch (error: any) {
    console.error('Get layer metadata error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single layer metadata by geoserver_name
export const getLayerMetadataByName = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;

    const result = await pool.query(
      'SELECT * FROM layer_metadata WHERE geoserver_name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layer metadata not found' });
    }

    res.status(200).json({
      metadata: result.rows[0]
    });
  } catch (error: any) {
    console.error('Get layer metadata error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create layer metadata (admin only)
export const createLayerMetadata = async (req: AuthRequest, res: Response) => {
  try {
    const { geoserver_name, file_path, class_labels } = req.body;

    if (!geoserver_name || !file_path || !class_labels) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM layer_metadata WHERE geoserver_name = $1',
      [geoserver_name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Layer metadata already exists' });
    }

    const result = await pool.query(
      `INSERT INTO layer_metadata (geoserver_name, file_path, class_labels)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [geoserver_name, file_path, JSON.stringify(class_labels)]
    );

    res.status(201).json({
      message: 'Layer metadata created successfully',
      metadata: result.rows[0]
    });
  } catch (error: any) {
    console.error('Create layer metadata error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update layer metadata (admin only)
export const updateLayerMetadata = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { geoserver_name, file_path, class_labels } = req.body;

    const metadataId = parseInt(id);
    if (isNaN(metadataId)) {
      return res.status(400).json({ error: 'Invalid metadata ID' });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT * FROM layer_metadata WHERE id = $1',
      [metadataId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Layer metadata not found' });
    }

    // Check if new name conflicts with another record
    if (geoserver_name) {
      const nameConflict = await pool.query(
        'SELECT id FROM layer_metadata WHERE geoserver_name = $1 AND id != $2',
        [geoserver_name, metadataId]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(409).json({ error: 'Layer name already in use' });
      }
    }

    const result = await pool.query(
      `UPDATE layer_metadata 
       SET geoserver_name = COALESCE($1, geoserver_name),
           file_path = COALESCE($2, file_path),
           class_labels = COALESCE($3, class_labels),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [geoserver_name, file_path, class_labels ? JSON.stringify(class_labels) : null, metadataId]
    );

    res.status(200).json({
      message: 'Layer metadata updated successfully',
      metadata: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update layer metadata error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete layer metadata (admin only)
export const deleteLayerMetadata = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const metadataId = parseInt(id);
    if (isNaN(metadataId)) {
      return res.status(400).json({ error: 'Invalid metadata ID' });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT id FROM layer_metadata WHERE id = $1',
      [metadataId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Layer metadata not found' });
    }

    await pool.query('DELETE FROM layer_metadata WHERE id = $1', [metadataId]);

    res.status(200).json({
      message: 'Layer metadata deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete layer metadata error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

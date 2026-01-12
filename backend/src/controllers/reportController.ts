import { Request, Response } from 'express';
import pool from '../config/database';

// Create a new invalid data report
export const createReport = async (req: any, res: Response) => {
  try {
    const userId = req.userId; // From authenticate middleware

    const {
      original_polygon,
      original_layer,
      original_colormap,
      invalid_area_polygon,
      comment,
    } = req.body;

    // Validate input
    if (!original_polygon || !original_layer || !original_colormap || !invalid_area_polygon || !comment) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate polygons
    if (original_polygon.type !== 'Polygon' || invalid_area_polygon.type !== 'Polygon') {
      return res.status(400).json({ error: 'Invalid polygon geometry type' });
    }

    // Insert report
    const result = await pool.query(
      `INSERT INTO invalid_data_reports
        (user_id, original_polygon, original_layer, original_colormap, invalid_area_polygon, comment)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
      [userId, JSON.stringify(original_polygon), original_layer, original_colormap, JSON.stringify(invalid_area_polygon), comment]
    );

    const report = result.rows[0];

    // Get user info
    const userResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      message: 'Report created successfully',
      report: {
        ...report,
        user: userResult.rows[0],
      }
    });
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all reports (admin only)
export const getAllReports = async (req: any, res: Response) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        r.*,
        u.name as reporter_name,
        u.email as reporter_email
      FROM invalid_data_reports r
      JOIN users u ON r.user_id = u.id
    `;

    const params: any[] = [];

    if (status && (status === 'invalid' || status === 'fixed')) {
      query += ` WHERE r.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);

    res.status(200).json({
      reports: result.rows
    });
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single report by ID
export const getReportById = async (req: any, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const result = await pool.query(
      `SELECT
        r.*,
        u.name as reporter_name,
        u.email as reporter_email
      FROM invalid_data_reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(200).json({
      report: result.rows[0]
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update report status (admin only)
export const updateReportStatus = async (req: any, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    if (!status || (status !== 'invalid' && status !== 'fixed')) {
      return res.status(400).json({ error: 'Invalid status. Must be "invalid" or "fixed"' });
    }

    // Check if report exists
    const existingReport = await pool.query(
      'SELECT id FROM invalid_data_reports WHERE id = $1',
      [reportId]
    );

    if (existingReport.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report
    const result = await pool.query(
      `UPDATE invalid_data_reports
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *`,
      [status, reportId]
    );

    const report = result.rows[0];

    // Get user info
    const userResult = await pool.query(
      'SELECT name, email FROM users WHERE id = $1',
      [report.user_id]
    );

    res.status(200).json({
      message: 'Report status updated successfully',
      report: {
        ...report,
        user: userResult.rows[0],
      }
    });
  } catch (error: any) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete report (admin only)
export const deleteReport = async (req: any, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    // Check if report exists
    const existingReport = await pool.query(
      'SELECT id FROM invalid_data_reports WHERE id = $1',
      [reportId]
    );

    if (existingReport.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete report
    await pool.query(
      'DELETE FROM invalid_data_reports WHERE id = $1',
      [reportId]
    );

    res.status(200).json({
      message: 'Report deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get reports by current user
export const getMyReports = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { status } = req.query;

    let query = `
      SELECT
        r.*
      FROM invalid_data_reports r
      WHERE r.user_id = $1
    `;

    const params: any[] = [userId];

    if (status && (status === 'invalid' || status === 'fixed')) {
      query += ` AND r.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);

    res.status(200).json({
      reports: result.rows
    });
  } catch (error: any) {
    console.error('Get my reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

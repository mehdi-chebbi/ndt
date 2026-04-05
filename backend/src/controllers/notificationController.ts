import { Response } from 'express';
import pool from '../config/database';

// Get all notification recipients
export const getAllRecipients = async (req: any, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notification_recipients ORDER BY created_at DESC'
    );

    res.status(200).json({
      recipients: result.rows
    });
  } catch (error: any) {
    console.error('Get recipients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new notification recipient
export const addRecipient = async (req: any, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if already exists
    const existing = await pool.query(
      'SELECT id FROM notification_recipients WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const result = await pool.query(
      'INSERT INTO notification_recipients (email) VALUES ($1) RETURNING *',
      [email.toLowerCase()]
    );

    res.status(201).json({
      message: 'Recipient added successfully',
      recipient: result.rows[0]
    });
  } catch (error: any) {
    console.error('Add recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove a notification recipient
export const removeRecipient = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const recipientId = parseInt(id);
    if (isNaN(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }

    // Check if exists
    const existing = await pool.query(
      'SELECT id FROM notification_recipients WHERE id = $1',
      [recipientId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    await pool.query('DELETE FROM notification_recipients WHERE id = $1', [recipientId]);

    res.status(200).json({
      message: 'Recipient removed successfully'
    });
  } catch (error: any) {
    console.error('Remove recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle recipient active status
export const toggleRecipient = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const recipientId = parseInt(id);
    if (isNaN(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient ID' });
    }

    // Check if exists and get current status
    const existing = await pool.query(
      'SELECT * FROM notification_recipients WHERE id = $1',
      [recipientId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const newStatus = !existing.rows[0].is_active;

    const result = await pool.query(
      'UPDATE notification_recipients SET is_active = $1 WHERE id = $2 RETURNING *',
      [newStatus, recipientId]
    );

    res.status(200).json({
      message: `Recipient ${newStatus ? 'activated' : 'deactivated'} successfully`,
      recipient: result.rows[0]
    });
  } catch (error: any) {
    console.error('Toggle recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

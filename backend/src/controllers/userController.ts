import { Response, AuthRequest } from 'express';
import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/auth';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone_number, country, job_title, institution, profile_complete, created_at FROM users ORDER BY created_at DESC'
    );

    res.status(200).json({
      users: result.rows
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(
      'SELECT id, name, email, role, phone_number, country, job_title, institution, profile_complete, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile (name, phone, country, job title, institution)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, phone_number, country, job_title, institution } = req.body;

    // Validate at least one field is provided
    if (!name && !phone_number && !country && !job_title && !institution) {
      return res.status(400).json({ error: 'At least one field is required' });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(phone_number);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      values.push(country);
    }
    if (job_title !== undefined) {
      updates.push(`job_title = $${paramIndex++}`);
      values.push(job_title);
    }
    if (institution !== undefined) {
      updates.push(`institution = $${paramIndex++}`);
      values.push(institution);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, email, role, phone_number, country, job_title, institution, profile_complete, created_at`,
      [...values, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Complete profile (used by OAuth users to fill required fields for the first time)
export const completeProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { phone_number, country, job_title, institution } = req.body;

    // All fields required
    if (!phone_number || !country || !job_title || !institution) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await pool.query(
      `UPDATE users SET phone_number = $1, country = $2, job_title = $3, institution = $4,
       profile_complete = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, email, role, phone_number, country, job_title, institution, profile_complete, created_at`,
      [phone_number, country, job_title, institution, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile completed successfully',
      user: result.rows[0]
    });
  } catch (error: any) {
    console.error('Complete profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password (authenticated user)
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get user with password
    const userResult = await pool.query(
      'SELECT id, password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if OAuth user (no real password)
    if (user.password === 'oauth_user_no_password') {
      return res.status(400).json({ error: 'OAuth users cannot change password. Use "Forgot password" to set one.' });
    }

    // Verify current password
    const isValidPassword = await comparePassword(current_password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update password
    const hashedPassword = await hashPassword(new_password);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

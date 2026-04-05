import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import pool from '../config/database';

const router = Router();

// Update tutorial completion status
router.patch('/me/tutorial', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { tutorial_completed } = req.body;

    if (typeof tutorial_completed !== 'boolean') {
      return res.status(400).json({ error: 'tutorial_completed must be a boolean' });
    }

    const result = await pool.query(
      'UPDATE users SET tutorial_completed = $1, updated_at = NOW() WHERE id = $2 RETURNING id, tutorial_completed',
      [tutorial_completed, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Tutorial status updated',
      tutorial_completed: result.rows[0].tutorial_completed
    });
  } catch (error: any) {
    console.error('Error updating tutorial status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

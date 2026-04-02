import { Response, AuthRequest } from 'express';
import pool from '../config/database';

// Create a new chat session for the authenticated user
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Deactivate any existing active sessions for this user
    await pool.query(
      'UPDATE chat_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    // Create new active session
    const result = await pool.query(
      'INSERT INTO chat_sessions (user_id, is_active) VALUES ($1, true) RETURNING *',
      [userId]
    );

    const session = result.rows[0];

    // Fetch user's name for the greeting
    const userResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [userId]
    );
    const userName = userResult.rows[0]?.name || 'there';
    const firstName = userName.split(' ')[0];

    // Insert a welcome greeting as the first assistant message
    const greeting = `Hi ${firstName}! 👋 How can I help you today?`;
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [session.id, 'assistant', greeting]
    );

    res.status(201).json({
      session: {
        id: session.id,
        title: session.title,
        is_active: session.is_active,
        created_at: session.created_at,
        updated_at: session.updated_at,
        messages: [{ role: 'assistant', content: greeting, created_at: session.created_at }],
      },
    });
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific session with its messages
export const getSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Get session (must belong to user)
    const sessionResult = await pool.query(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Get messages (exclude system messages from response)
    const messagesResult = await pool.query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 AND role != \'system\' ORDER BY created_at ASC',
      [session.id]
    );

    res.status(200).json({
      session: {
        id: session.id,
        title: session.title,
        is_active: session.is_active,
        created_at: session.created_at,
        updated_at: session.updated_at,
        messages: messagesResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get or create the active session for the authenticated user
export const getActiveSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Check for existing active session
    const existingResult = await pool.query(
      'SELECT * FROM chat_sessions WHERE user_id = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    if (existingResult.rows.length > 0) {
      const session = existingResult.rows[0];

      const messagesResult = await pool.query(
        'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 AND role != \'system\' ORDER BY created_at ASC',
        [session.id]
      );

      return res.status(200).json({
        session: {
          id: session.id,
          title: session.title,
          is_active: session.is_active,
          created_at: session.created_at,
          updated_at: session.updated_at,
          messages: messagesResult.rows,
        },
      });
    }

    // No active session — return null so frontend knows to create one
    res.status(200).json({ session: null });
  } catch (error: any) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List all sessions for the authenticated user (for profile/history page)
export const listSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(
      `SELECT s.id, s.title, s.is_active, s.created_at, s.updated_at,
              COUNT(m.id) as message_count,
              (
                SELECT content FROM chat_messages
                WHERE session_id = s.id AND role = 'user'
                ORDER BY created_at DESC LIMIT 1
              ) as last_user_message
       FROM chat_sessions s
       LEFT JOIN chat_messages m ON m.session_id = s.id AND m.role != 'system'
       WHERE s.user_id = $1
       GROUP BY s.id
       HAVING COUNT(CASE WHEN m.role = 'user' THEN 1 END) > 0
       ORDER BY s.updated_at DESC`,
      [userId]
    );

    res.status(200).json({ sessions: result.rows });
  } catch (error: any) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get messages for a specific session (for viewing history)
export const getSessionMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Verify session belongs to user
    const sessionResult = await pool.query(
      'SELECT id, title FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messagesResult = await pool.query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 AND role != \'system\' ORDER BY created_at ASC',
      [id]
    );

    res.status(200).json({
      session: {
        id: sessionResult.rows[0].id,
        title: sessionResult.rows[0].title,
      },
      messages: messagesResult.rows,
    });
  } catch (error: any) {
    console.error('Get session messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update session title
export const updateSessionTitle = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      'UPDATE chat_sessions SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [title.substring(0, 255), parseInt(id), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json({ session: result.rows[0] });
  } catch (error: any) {
    console.error('Update session title error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a session
export const deleteSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [parseInt(id), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json({ message: 'Session deleted successfully' });
  } catch (error: any) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Track a user action (called from frontend)
export const trackAction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { action_type, metadata } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!action_type || !['layer_view', 'compare_started', 'map_exported'].includes(action_type)) {
      return res.status(400).json({ error: 'Invalid action_type. Must be one of: layer_view, compare_started, map_exported' });
    }

    await pool.query(
      'INSERT INTO user_actions (user_id, action_type, metadata) VALUES ($1, $2, $3)',
      [userId, action_type, metadata ? JSON.stringify(metadata) : null]
    );

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error tracking action:', error);
    return res.status(500).json({ error: 'Failed to track action' });
  }
};

// Get aggregated analytics (admin only)
export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    // Get all users with their activity counts
    const usersResult = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.country, u.institution, u.created_at,
        COALESCE(ua_stats.layer_views, 0) AS layer_views,
        COALESCE(ua_stats.compare_started, 0) AS compare_started,
        COALESCE(ua_stats.map_exported, 0) AS map_exported,
        COALESCE(chat_stats.chat_sessions, 0) AS chat_sessions,
        COALESCE(chat_stats.chat_messages, 0) AS chat_messages,
        COALESCE(ua_stats.last_action_at, chat_stats.last_chat_at) AS last_active
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) FILTER (WHERE action_type = 'layer_view') AS layer_views,
          COUNT(*) FILTER (WHERE action_type = 'compare_started') AS compare_started,
          COUNT(*) FILTER (WHERE action_type = 'map_exported') AS map_exported,
          MAX(created_at) AS last_action_at
        FROM user_actions
        GROUP BY user_id
      ) ua_stats ON u.id = ua_stats.user_id
      LEFT JOIN (
        SELECT 
          cs.user_id,
          COUNT(DISTINCT cs.id) AS chat_sessions,
          COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS chat_messages,
          MAX(cs.updated_at) AS last_chat_at
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cs.id = cm.session_id
        GROUP BY cs.user_id
      ) chat_stats ON u.id = chat_stats.user_id
      ORDER BY COALESCE(ua_stats.last_action_at, chat_stats.last_chat_at) DESC NULLS LAST, u.created_at DESC
    `);

    // Get total counts for overview cards
    const totalsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE action_type = 'layer_view') AS total_layer_views,
        COUNT(*) FILTER (WHERE action_type = 'compare_started') AS total_compares,
        COUNT(*) FILTER (WHERE action_type = 'map_exported') AS total_exports,
        COUNT(*) AS total_actions
      FROM user_actions
    `);

    // Get AI chat totals
    const chatTotalsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT cs.id) AS total_chat_sessions,
        COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS total_chat_messages
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id
    `);

    // Get action timeline (last 30 days, grouped by day)
    const timelineResult = await pool.query(`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) FILTER (WHERE action_type = 'layer_view') AS layer_views,
        COUNT(*) FILTER (WHERE action_type = 'compare_started') AS compares,
        COUNT(*) FILTER (WHERE action_type = 'map_exported') AS exports
      FROM user_actions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Get chat timeline (last 30 days)
    const chatTimelineResult = await pool.query(`
      SELECT 
        DATE(cs.created_at) AS date,
        COUNT(DISTINCT cs.id) AS chat_sessions,
        COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS chat_messages
      FROM chat_sessions cs
      LEFT JOIN chat_messages cm ON cs.id = cm.session_id AND DATE(cm.created_at) = DATE(cs.created_at)
      WHERE cs.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(cs.created_at)
      ORDER BY date ASC
    `);

    // Get top layers viewed
    const topLayersResult = await pool.query(`
      SELECT 
        metadata->>'layerName' AS layer_name,
        COUNT(*) AS view_count
      FROM user_actions
      WHERE action_type = 'layer_view' AND metadata->>'layerName' IS NOT NULL
      GROUP BY metadata->>'layerName'
      ORDER BY view_count DESC
      LIMIT 10
    `);

    // Get feature popularity breakdown
    const featureBreakdownResult = await pool.query(`
      SELECT action_type, COUNT(*) AS count
      FROM user_actions
      GROUP BY action_type
      ORDER BY count DESC
    `);

    // Get active users count (users with actions in last 7 days)
    const activeUsersResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) AS active_users_7d
      FROM user_actions
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    const chatActiveUsersResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id) AS active_chat_users_7d
      FROM chat_sessions
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    return res.json({
      users: usersResult.rows,
      totals: {
        ...totalsResult.rows[0],
        ...chatTotalsResult.rows[0],
        active_users_7d: (parseInt(activeUsersResult.rows[0]?.active_users_7d || '0') + parseInt(chatActiveUsersResult.rows[0]?.active_chat_users_7d || '0')) || 0,
      },
      timeline: timelineResult.rows,
      chatTimeline: chatTimelineResult.rows,
      topLayers: topLayersResult.rows,
      featureBreakdown: featureBreakdownResult.rows,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Get detailed activity for a specific user (admin only)
export const getUserActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;

    // Get user info
    const userResult = await pool.query(
      'SELECT id, name, email, role, country, institution, phone_number, job_title, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's actions (paginated, latest 100)
    const actionsResult = await pool.query(
      `SELECT action_type, metadata, created_at 
       FROM user_actions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [userId]
    );

    // Get user's chat sessions with message counts
    const chatSessionsResult = await pool.query(
      `SELECT cs.id, cs.title, cs.created_at, cs.updated_at,
              COUNT(cm.id) FILTER (WHERE cm.role = 'user') AS user_messages,
              COUNT(cm.id) FILTER (WHERE cm.role = 'assistant') AS assistant_messages
       FROM chat_sessions cs
       LEFT JOIN chat_messages cm ON cs.id = cm.session_id
       WHERE cs.user_id = $1
       GROUP BY cs.id
       ORDER BY cs.updated_at DESC
       LIMIT 50`,
      [userId]
    );

    // Get user's action counts by type
    const actionCountsResult = await pool.query(
      `SELECT action_type, COUNT(*) AS count
       FROM user_actions
       WHERE user_id = $1
       GROUP BY action_type`,
      [userId]
    );

    return res.json({
      user: userResult.rows[0],
      actions: actionsResult.rows,
      chatSessions: chatSessionsResult.rows,
      actionCounts: actionCountsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return res.status(500).json({ error: 'Failed to fetch user activity' });
  }
};

import { Router } from 'express';
import { trackAction, getAnalytics, getUserActivity } from '../controllers/analyticsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Track a user action (any authenticated user)
router.post('/track', authenticate, trackAction);

// Get aggregated analytics (admin only)
router.get('/', authenticate, requireAdmin, getAnalytics);

// Get specific user activity (admin only)
router.get('/user/:userId', authenticate, requireAdmin, getUserActivity);

export default router;

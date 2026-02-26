import { Router } from 'express';
import { getAllRecipients, addRecipient, removeRecipient, toggleRecipient } from '../controllers/notificationController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin role
router.get('/', authenticate, requireAdmin, getAllRecipients);
router.post('/', authenticate, requireAdmin, addRecipient);
router.delete('/:id', authenticate, requireAdmin, removeRecipient);
router.patch('/:id/toggle', authenticate, requireAdmin, toggleRecipient);

export default router;

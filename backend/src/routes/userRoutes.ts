import { Router } from 'express';
import { getAllUsers, deleteUser, getCurrentUser } from '../controllers/userController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Get current user (authenticated)
router.get('/me', authenticate, getCurrentUser);

// Admin only routes
router.get('/users', authenticate, requireAdmin, getAllUsers);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

export default router;

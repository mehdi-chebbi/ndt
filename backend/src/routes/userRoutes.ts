import { Router } from 'express';
import { getAllUsers, deleteUser, getCurrentUser, updateProfile, completeProfile, changePassword } from '../controllers/userController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Get current user (authenticated)
router.get('/me', authenticate, getCurrentUser);

// Update profile (authenticated)
router.put('/me/profile', authenticate, updateProfile);

// Complete profile (authenticated - first time for OAuth users)
router.put('/me/complete-profile', authenticate, completeProfile);

// Change password (authenticated)
router.put('/me/password', authenticate, changePassword);

// Admin only routes
router.get('/users', authenticate, requireAdmin, getAllUsers);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

export default router;

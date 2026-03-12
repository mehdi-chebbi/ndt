import { Router } from 'express';
import { signup, login, forgotPassword, verifyResetCode, resetPassword } from '../controllers/authController';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

export default router;

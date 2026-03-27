import { Router } from 'express';
import { signup, login, forgotPassword, verifyResetCode, resetPassword, googleAuthSuccess, googleAuthFailed } from '../controllers/authController';
import passport from '../config/passport';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
  googleAuthSuccess
);

export default router;

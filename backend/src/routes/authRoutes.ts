import { Router } from 'express';
import { signup, login, forgotPassword, verifyResetCode, resetPassword, googleAuthSuccess, googleAuthFailed, microsoftAuthSuccess, microsoftAuthFailed } from '../controllers/authController';
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

// Microsoft OAuth routes
router.get('/microsoft', passport.authenticate('microsoft', { failureRedirect: '/login?error=microsoft_auth_failed' }));

router.get(
  '/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/login?error=microsoft_auth_failed' }),
  microsoftAuthSuccess
);

export default router;

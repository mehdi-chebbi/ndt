import { Router } from 'express';
import { signup, login } from '../controllers/authController';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

export default router;

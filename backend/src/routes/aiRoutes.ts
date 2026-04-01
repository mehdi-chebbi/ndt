import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { chat } from '../controllers/aiController';

const router = Router();

// Chat endpoint - requires authentication
router.post('/chat', authenticate, chat);

export default router;

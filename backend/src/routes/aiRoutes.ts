import { Router } from 'express';
import { chat } from '../controllers/aiController';

const router = Router();

// Chat endpoint - requires authentication
router.post('/chat', chat);

export default router;

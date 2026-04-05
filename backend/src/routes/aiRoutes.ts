import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { chat, analyzeAreaWithAI } from '../controllers/aiController';

const router = Router();

// Chat endpoint - requires authentication
router.post('/chat', authenticate, chat);

// Analyze area with AI - requires authentication
router.post('/analyze-area', authenticate, analyzeAreaWithAI);

export default router;

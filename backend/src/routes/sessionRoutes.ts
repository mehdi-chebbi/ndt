import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createSession,
  getActiveSession,
  getSession,
  listSessions,
  getSessionMessages,
  updateSessionTitle,
  deleteSession,
} from '../controllers/sessionController';

const router = Router();

// All session routes require authentication
router.use(authenticate);

// Get or create active session
router.get('/active', getActiveSession);

// Create a new session
router.post('/', createSession);

// List all sessions for the user (profile/history)
router.get('/', listSessions);

// Get a specific session
router.get('/:id', getSession);

// Get messages for a specific session
router.get('/:id/messages', getSessionMessages);

// Update session title
router.patch('/:id/title', updateSessionTitle);

// Delete a session
router.delete('/:id', deleteSession);

export default router;

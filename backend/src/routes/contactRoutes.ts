import { Router } from 'express';
import { submitContact } from '../controllers/contactController';

const router = Router();

// Submit contact form (public — no auth required)
router.post('/', submitContact);

export default router;

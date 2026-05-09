import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAllGroups,
  getGroupsTree,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup
} from '../controllers/groupController';

const router = Router();

// Public routes (authenticated users can view)
router.get('/', authenticate, getAllGroups);
router.get('/tree', authenticate, getGroupsTree);
router.get('/:id', authenticate, getGroupById);

// Admin only routes
router.post('/', authenticate, requireAdmin, createGroup);
router.put('/:id', authenticate, requireAdmin, updateGroup);
router.delete('/:id', authenticate, requireAdmin, deleteGroup);

export default router;

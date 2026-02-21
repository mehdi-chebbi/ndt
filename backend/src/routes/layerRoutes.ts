import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAllLayers,
  getLayerById,
  getLayerByName,
  createLayer,
  updateLayer,
  deleteLayer
} from '../controllers/layerController';
import { getStatsForPolygon } from '../controllers/statsController';

const router = Router();

// Public routes (authenticated users can view)
router.get('/', authenticate, getAllLayers);
router.get('/id/:id', authenticate, getLayerById);
router.get('/name/:name', authenticate, getLayerByName);

// Admin only routes for managing layers
router.post('/', authenticate, requireAdmin, createLayer);
router.put('/:id', authenticate, requireAdmin, updateLayer);
router.delete('/:id', authenticate, requireAdmin, deleteLayer);

// Stats endpoint (authenticated users can request stats)
router.post('/stats', authenticate, getStatsForPolygon);

export default router;

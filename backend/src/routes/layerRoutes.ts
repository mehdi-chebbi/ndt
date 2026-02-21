import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAllLayerMetadata,
  getLayerMetadataByName,
  createLayerMetadata,
  updateLayerMetadata,
  deleteLayerMetadata
} from '../controllers/layerController';
import { getStatsForPolygon } from '../controllers/statsController';

const router = Router();

// Public routes (authenticated users can view)
router.get('/metadata', authenticate, getAllLayerMetadata);
router.get('/metadata/:name', authenticate, getLayerMetadataByName);

// Admin only routes for managing metadata
router.post('/metadata', authenticate, requireAdmin, createLayerMetadata);
router.put('/metadata/:id', authenticate, requireAdmin, updateLayerMetadata);
router.delete('/metadata/:id', authenticate, requireAdmin, deleteLayerMetadata);

// Stats endpoint (authenticated users can request stats)
router.post('/stats', authenticate, getStatsForPolygon);

export default router;

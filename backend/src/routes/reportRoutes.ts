import { Router } from 'express';
import { createReport, getAllReports, getReportById, updateReportStatus, deleteReport, getMyReports } from '../controllers/reportController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Create a new invalid data report (authenticated users)
router.post('/', authenticate, createReport);

// Get all reports (admin only) - supports ?status=invalid or ?status=fixed filter
router.get('/all', authenticate, requireAdmin, getAllReports);

// Get my reports (authenticated users)
router.get('/my', authenticate, getMyReports);

// Get a single report by ID (admin only)
router.get('/:id', authenticate, requireAdmin, getReportById);

// Update report status (admin only)
router.patch('/:id/status', authenticate, requireAdmin, updateReportStatus);

// Delete report (admin only)
router.delete('/:id', authenticate, requireAdmin, deleteReport);

export default router;

/**
 * Cash Drawer & Custody Handover Routes for BURSA
 * Route definitions for Bursar closeout and Proprietor custody confirmation.
 */

import express from 'express';
import {
  getCurrentCashDrawer,
  closeCashDrawer,
  confirmCashHandover,
  getSchoolHandovers
} from '../controllers/cashDrawerController.js';
import { verifyToken, verifySchoolAccess, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Require authenticated session for all cash drawer operations
router.use(verifyToken);

// 1. Current Active Unremitted Cash Drawer
router.get('/:schoolId/cash-drawer/current', verifySchoolAccess, getCurrentCashDrawer);

// 2. End-of-Day Shift Closeout (Bursar Maker)
router.post('/:schoolId/cash-drawer/close', verifySchoolAccess, closeCashDrawer);

// 3. Proprietor Custody Confirmation (Checker: STRICTLY PROPRIETOR ONLY)
router.post(
  '/:schoolId/cash-drawer/:handoverId/confirm',
  verifySchoolAccess,
  requireRole(['PROPRIETOR']),
  confirmCashHandover
);

// 4. Audit Trail & Handover History
router.get('/:schoolId/cash-drawer/handovers', verifySchoolAccess, getSchoolHandovers);
router.get('/handovers', verifySchoolAccess, getSchoolHandovers);

export default router;

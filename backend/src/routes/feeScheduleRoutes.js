/**
 * Fee Schedule Routes for BURSA
 * Manages endpoints for configuring class fee schedules.
 */

import express from 'express';
import {
  createOrUpdateFeeSchedule,
  getSchoolFeeSchedules,
  deleteFeeSchedule
} from '../controllers/feeScheduleController.js';
import { verifyToken, verifySchoolAccess } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Require authenticated session for fee schedule management
router.use(verifyToken);

// Upsert fee schedule
router.post('/', createOrUpdateFeeSchedule);

// Retrieve fee schedules (Scoped to School)
router.get('/', getSchoolFeeSchedules);
router.get('/:schoolId', verifySchoolAccess, getSchoolFeeSchedules);

// Delete fee schedule
router.delete('/:id', deleteFeeSchedule);
router.delete('/:schoolId/:id', verifySchoolAccess, deleteFeeSchedule);

export default router;

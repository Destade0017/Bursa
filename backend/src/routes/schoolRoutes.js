/**
 * School Routes
 * Endpoint routing definitions for school and student management.
 */

import express from 'express';
import {
  createSchool,
  getSchools,
  getSchoolById,
  updateSchool,
  uploadSchoolLogo,
  deleteSchoolLogo,
  createStudent,
  getStudentsBySchool,
  bulkCreateStudents,
  connectPayoutAccount,
  createStaffMember,
  deleteStaffMember,
  getSchoolStaff
} from '../controllers/schoolController.js';
import { getSchoolInvoices } from '../controllers/invoiceController.js';
import {
  generateMassTermInvoices,
  getSchoolFeeSchedules,
  deleteFeeSchedule
} from '../controllers/feeScheduleController.js';
import { requireRole, verifyToken, verifySchoolAccess } from '../middlewares/authMiddleware.js';

const router = express.Router();

// School discovery / listing (Authenticated)
router.post('/', verifyToken, requireRole(['PROPRIETOR']), createSchool);
router.get('/', verifyToken, getSchools);

// School Profile & Settings Routes (Authenticated & Tenant-Isolated)
router.get('/:schoolId', verifyToken, verifySchoolAccess, getSchoolById);
router.put('/:schoolId', verifyToken, verifySchoolAccess, requireRole(['PROPRIETOR']), updateSchool);
router.post('/:schoolId/logo', verifyToken, verifySchoolAccess, requireRole(['PROPRIETOR']), uploadSchoolLogo);
router.delete('/:schoolId/logo', verifyToken, verifySchoolAccess, requireRole(['PROPRIETOR']), deleteSchoolLogo);

// Staff Management Routes (Authenticated, Tenant-Isolated & Role-Restricted)
router.post('/:schoolId/staff', verifyToken, verifySchoolAccess, requireRole(['PROPRIETOR']), createStaffMember);
router.delete('/:schoolId/staff/:staffId', verifyToken, verifySchoolAccess, requireRole(['PROPRIETOR']), deleteStaffMember);
router.get('/:schoolId/staff', verifyToken, verifySchoolAccess, getSchoolStaff);

// Sensitive Settlement Bank Account Route - STRICTLY RESTRICTED TO PROPRIETOR
router.post('/:schoolId/connect-payout', verifyToken, verifySchoolAccess, requireRole(['PROPRIETOR']), connectPayoutAccount);

// Daily Bursar & Proprietor Operations (Authenticated & Tenant-Isolated)
router.post('/:schoolId/students', verifyToken, verifySchoolAccess, createStudent);
router.post('/:schoolId/students/bulk', verifyToken, verifySchoolAccess, bulkCreateStudents);
router.get('/:schoolId/students', verifyToken, verifySchoolAccess, getStudentsBySchool);
router.get('/:schoolId/invoices', verifyToken, verifySchoolAccess, getSchoolInvoices);

// Fee Schedules & 1-Click Mass Invoicing Operations (Authenticated & Tenant-Isolated)
router.get('/:schoolId/fee-schedules', verifyToken, verifySchoolAccess, getSchoolFeeSchedules);
router.delete('/:schoolId/fee-schedules/:id', verifyToken, verifySchoolAccess, deleteFeeSchedule);
router.post('/:schoolId/invoices/generate-mass', verifyToken, verifySchoolAccess, generateMassTermInvoices);

export default router;


/**
 * Student Routes
 * Endpoint routing definitions for student records and student invoices.
 */

import express from 'express';
import { createStudent } from '../controllers/schoolController.js';
import { getStudentInvoices } from '../controllers/invoiceController.js';
import { verifyToken, verifySchoolAccess } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create student record (Authenticated & Tenant-Isolated)
router.post('/', verifyToken, verifySchoolAccess, createStudent);
router.post('/:schoolId', verifyToken, verifySchoolAccess, createStudent);

// Get all invoices for a specific student (Authenticated)
router.get('/:studentId/invoices', verifyToken, getStudentInvoices);

export default router;

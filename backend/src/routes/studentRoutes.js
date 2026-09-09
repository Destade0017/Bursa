/**
 * Student Routes
 * Endpoint routing definitions for student records and student invoices.
 */

import express from 'express';
import { getStudentInvoices } from '../controllers/invoiceController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get all invoices for a specific student (Authenticated)
router.get('/:studentId/invoices', verifyToken, getStudentInvoices);

export default router;

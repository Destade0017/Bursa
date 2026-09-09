/**
 * Invoice Routes
 * Endpoint routing definitions for invoice management.
 */

import express from 'express';
import { createInvoice } from '../controllers/invoiceController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create new invoice (Authenticated)
router.post('/', verifyToken, createInvoice);

export default router;

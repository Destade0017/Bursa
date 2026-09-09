/**
 * Payment & Webhook Routes
 * Routing for bank transfer webhook notifications and payment history.
 */

import express from 'express';
import {
  handlePaymentWebhook,
  getInvoicePayments,
  getSuspenseTransactions,
  allocateSuspenseTransaction,
  recordCashPayment,
  getAllTransactions
} from '../controllers/paymentController.js';

import { verifyToken, verifySchoolAccess } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Webhook endpoint for bank transfer payment notifications (Mock engine / simulation)
router.post('/webhooks/mock-payment', handlePaymentWebhook);

// Cash Office Counter Entry Endpoint (Authenticated Staff Only)
router.post('/payments/cash', verifyToken, recordCashPayment);

// School-wide Live Transactions Audit Stream (Authenticated & Tenant-Isolated)
router.get('/schools/:schoolId/transactions', verifyToken, verifySchoolAccess, getAllTransactions);

// Get payment installments for a specific invoice (Authenticated)
router.get('/invoices/:invoiceId/payments', verifyToken, getInvoicePayments);

// Suspense Queue Exception Endpoints (Authenticated & Tenant-Isolated)
router.get('/schools/:schoolId/suspense', verifyToken, verifySchoolAccess, getSuspenseTransactions);
router.post('/suspense/:id/allocate', verifyToken, allocateSuspenseTransaction);

export default router;

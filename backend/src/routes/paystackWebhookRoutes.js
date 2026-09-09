/**
 * Official Paystack Webhook Routes
 * Endpoint for receiving signed HTTP POST webhook notifications from Paystack servers.
 */

import express from 'express';
import { verifyPaystackSignature } from '../middlewares/verifyPaystack.js';
import { handlePaystackWebhook } from '../controllers/paystackWebhookController.js';

const router = express.Router();

// Mount Paystack webhook with HMAC-SHA512 signature verification middleware
router.post('/webhooks/paystack', verifyPaystackSignature, handlePaystackWebhook);

export default router;

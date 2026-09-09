/**
 * Official Paystack Webhook Controller
 * Receives charge.success payment events from Paystack and routes them to our automated reconciliation engine.
 */

import { handlePaymentWebhook } from './paymentController.js';

/**
 * Handle Official Paystack Webhook Event
 * POST /api/webhooks/paystack
 */
export const handlePaystackWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;

    // Acknowledge non-payment events immediately
    if (event !== 'charge.success') {
      return res.status(200).json({ status: true, message: `Event '${event}' acknowledged.` });
    }

    if (!data) {
      return res.status(400).json({ error: 'Invalid Paystack payload: data object missing.' });
    }

    // Extract payment details from Paystack charge.success payload
    const transactionReference = data.reference;
    const amountKobo = data.amount; // Paystack sends amounts natively in Kobo
    const amountNaira = amountKobo / 100;

    // Paystack DVA payload extractors (supports dedicated_account, authorization, or receiver_account)
    const accountNumber =
      data.dedicated_account?.account_number ||
      data.authorization?.account_number ||
      data.dva?.account_number ||
      data.receiver_account_number ||
      data.account_number;

    const senderName = data.customer
      ? `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim() || 'Paystack Customer Transfer'
      : 'Direct Bank Transfer';

    // Route clean normalized parameters to our core payment reconciliation engine
    req.body = {
      accountNumber,
      amountKobo,
      amountNaira,
      transactionReference,
      senderName,
      source: 'PAYSTACK_WEBHOOK'
    };

    // Forward to core reconciliation handler
    return await handlePaymentWebhook(req, res);
  } catch (error) {
    console.error('Paystack webhook processing error:', error);
    // Always return 200 to Paystack to prevent endless retry loops for bad payloads
    return res.status(200).json({ status: false, error: error.message });
  }
};

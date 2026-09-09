/**
 * Cryptographic Paystack Webhook Verification Middleware
 * Uses HMAC-SHA512 and constant-time buffer comparison to verify that incoming
 * webhook payloads genuinely originate from Paystack servers, preventing spoofing and timing attacks.
 */

import crypto from 'crypto';

// Official Paystack webhook egress IP addresses (optional defense-in-depth)
const PAYSTACK_WHITELISTED_IPS = new Set([
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220'
]);

/**
 * Verify Paystack HMAC-SHA512 Webhook Signature
 */
export const verifyPaystackSignature = (req, res, next) => {
  try {
    const rawSignature = req.headers['x-paystack-signature'];
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!rawSignature) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing x-paystack-signature header. Webhook request rejected.'
      });
    }

    if (!secretKey) {
      return res.status(500).json({
        error: 'Server Misconfiguration',
        message: 'PAYSTACK_SECRET_KEY is not defined in environment variables.'
      });
    }

    // Optional defense-in-depth IP validation if enabled in production
    if (process.env.PAYSTACK_ENFORCE_IP_WHITELIST === 'true') {
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp = forwarded
        ? String(forwarded).split(',')[0].trim().replace(/^::ffff:/, '')
        : String(req.socket?.remoteAddress || '').replace(/^::ffff:/, '');

      if (!PAYSTACK_WHITELISTED_IPS.has(clientIp)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Untrusted webhook origin IP address: ${clientIp}.`
        });
      }
    }

    // Use rawBody buffer captured during body-parsing for byte-exact cryptographic precision
    const payload = req.rawBody
      ? req.rawBody
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(payload)
      .digest('hex');

    const signature = String(rawSignature).trim().toLowerCase();

    // Constant-time comparison using crypto.timingSafeEqual to prevent side-channel timing attacks
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const computedBuffer = Buffer.from(computedHash, 'utf8');

    if (
      signatureBuffer.length !== computedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, computedBuffer)
    ) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Cryptographic signature mismatch. Webhook rejected to prevent fraudulent payment spoofing.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Signature verification failed',
      details: error.message
    });
  }
};

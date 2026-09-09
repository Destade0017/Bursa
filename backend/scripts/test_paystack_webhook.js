/**
 * Paystack HMAC Webhook Verification Test Script
 * Computes cryptographic HMAC-SHA512 signatures using PAYSTACK_SECRET_KEY
 * and verifies that the Express server accepts authentic requests and rejects fraudulent ones.
 */

import crypto from 'crypto';
import axios from 'axios';

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_secret_key_12345';
const SERVER_URL = 'http://localhost:5001/api/webhooks/paystack';

// Sample Paystack charge.success webhook payload
const mockPayload = {
  event: 'charge.success',
  data: {
    id: 9918231,
    domain: 'test',
    status: 'success',
    reference: `PSTK-REF-${Date.now()}`,
    amount: 4500000, // ₦45,000 in kobo
    message: null,
    gateway_response: 'Successful',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    channel: 'dedicated_nunique_account',
    currency: 'NGN',
    ip_address: '102.89.23.11',
    customer: {
      id: 88123,
      first_name: 'Samuel',
      last_name: 'Adesuyi',
      email: 'samuel.adesuyi@gmail.com',
      customer_code: 'CUST_adesuyi1'
    },
    dedicated_account: {
      account_number: '9910000101', // DVA for John Adesuyi
      bank: {
        name: 'Wema Bank'
      }
    }
  }
};

const runVerificationTests = async () => {
  console.log('----------------------------------------------------');
  console.log('🔐 PAYSTACK HMAC-SHA512 WEBHOOK SECURITY VERIFICATION');
  console.log('----------------------------------------------------');

  const rawJson = JSON.stringify(mockPayload);

  // 1. Generate Authentic Signature using HMAC-SHA512
  const validSignature = crypto
    .createHmac('sha512', SECRET_KEY)
    .update(rawJson)
    .digest('hex');

  console.log(`Generated HMAC Signature: ${validSignature.slice(0, 32)}...`);

  // Test Case A: Authentic Webhook with Valid Signature
  try {
    console.log('\n[TEST A] Sending authentic Paystack webhook with valid HMAC signature...');
    const response = await axios.post(SERVER_URL, mockPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': validSignature
      }
    });

    console.log('✅ TEST A PASSED! Server accepted authentic signature.');
    console.log('HTTP Status:', response.status);
    console.log('Response Payload:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('❌ TEST A FAILED:', err.response ? err.response.data : err.message);
  }

  // Test Case B: Fraudulent Webhook with Invalid Signature
  try {
    console.log('\n[TEST B] Sending spoofed webhook with INVALID HMAC signature...');
    const invalidSignature = 'invalid_attacker_hash_1234567890abcdef';
    
    await axios.post(SERVER_URL, mockPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': invalidSignature
      }
    });

    console.error('❌ TEST B FAILED: Server accepted fraudulent signature!');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('✅ TEST B PASSED! Server rejected spoofed webhook with 401 Unauthorized.');
      console.log('HTTP Status:', err.response.status);
      console.log('Security Response:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('❌ TEST B FAILED with unexpected error:', err.message);
    }
  }

  console.log('\n----------------------------------------------------');
  console.log('🎉 ALL PAYSTACK WEBHOOK SECURITY TESTS COMPLETED!');
  console.log('----------------------------------------------------');
};

runVerificationTests();

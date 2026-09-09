/**
 * Paystack Service
 * Handles customer creation and Dedicated Virtual Account (DVA) provisioning.
 * Supports both MOCK mode and live Paystack API integration.
 */

import axios from 'axios';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Provision a Dedicated Virtual Account (DVA) for a parent/student
 * @param {Object} params - { firstName, lastName, email, phone }
 * @returns {Promise<Object>} { accountNumber, bankName, customerCode }
 */
export const createDedicatedVirtualAccount = async ({ firstName, lastName, email, phone }) => {
  const provider = (process.env.PAYMENT_PROVIDER || 'MOCK').toUpperCase();

  // Mode 1: MOCK DVA Generation (Default for local dev & testing)
  if (provider === 'MOCK') {
    const dummyAccountNumber = `99${Math.floor(10000000 + Math.random() * 90000000)}`;
    return {
      accountNumber: dummyAccountNumber,
      bankName: 'Wema Bank (Test)',
      customerCode: `CUST_mock_${Date.now()}`
    };
  }

  // Mode 2: LIVE Paystack API DVA Provisioning
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey.startsWith('sk_test_mock')) {
      throw new Error('PAYSTACK_SECRET_KEY is required when PAYMENT_PROVIDER is set to PAYSTACK.');
    }

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    };

    // Step 1: Register Parent/Student as a Paystack Customer
    const parentEmail = email || `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}@bursar.edu.ng`;
    
    const customerResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/customer`,
      {
        email: parentEmail,
        first_name: firstName,
        last_name: lastName,
        phone: phone || '08000000000'
      },
      { headers }
    );

    const customerData = customerResponse.data.data;
    const customerCode = customerData.customer_code;

    // Step 2: Request Dedicated Virtual Account linked to the Customer Code
    const dvaResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/dedicated_account`,
      {
        customer: customerCode,
        preferred_bank: 'wema-bank'
      },
      { headers }
    );

    const dvaData = dvaResponse.data.data;

    return {
      accountNumber: dvaData.account_number,
      bankName: dvaData.bank ? dvaData.bank.name : 'Wema Bank',
      customerCode
    };
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('Paystack DVA Provisioning Failed:', errorMessage);
    throw new Error(`Failed to issue Paystack Dedicated Virtual Account: ${errorMessage}`);
  }
};

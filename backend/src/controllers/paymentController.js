/**
 * Payment Controller & Automated Reconciliation Engine
 * Handles bank transfer webhook processing, DVA lookup, invoice matching, and payment ledger creation.
 * Includes Suspense Queue exception parking and manual allocation logic.
 */

import { prisma } from '../config/db.js';

/**
 * Handle Bank Transfer Webhook (Mock Payment Engine)
 * POST /api/webhooks/mock-payment
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const { accountNumber, amountNaira, transactionReference, senderName } = req.body;
    let amountKobo = req.body.amountKobo;

    if (!amountKobo && amountNaira) {
      amountKobo = Math.round(Number(amountNaira) * 100);
    }

    if (!accountNumber || !transactionReference || !amountKobo || amountKobo <= 0) {
      return res.status(400).json({
        error: 'accountNumber, transactionReference, and valid amountKobo (or amountNaira) are required.'
      });
    }

    // 1. Idempotency Check: Check if already processed in Payments OR Suspense Queue
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionReference }
    });

    if (existingPayment) {
      return res.status(409).json({
        error: 'Duplicate transaction reference.',
        message: 'This payment transaction has already been processed.'
      });
    }

    const existingSuspense = await prisma.suspenseTransaction.findUnique({
      where: { transactionReference }
    });

    if (existingSuspense) {
      return res.status(409).json({
        error: 'Duplicate transaction reference.',
        message: 'This transaction is already parked in the suspense queue.'
      });
    }

    // Determine target school ID (default to first available school if unknown DVA)
    let schoolId = req.body.schoolId;
    if (!schoolId) {
      const defaultSchool = await prisma.school.findFirst();
      schoolId = defaultSchool ? defaultSchool.id : null;
    }

    // 2. DVA Lookup: Find student by Virtual Account Number
    const virtualAccount = await prisma.virtualAccount.findUnique({
      where: { accountNumber },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            schoolId: true
          }
        }
      }
    });

    // Exception Case A: Virtual Account not found in active student database
    if (!virtualAccount) {
      const suspenseItem = await prisma.suspenseTransaction.create({
        data: {
          schoolId,
          transactionReference,
          senderName: senderName || 'Direct Transfer / Unregistered Account',
          attemptedAccountNumber: accountNumber,
          amountKobo,
          reason: 'UNRECOGNIZED_ACCOUNT',
          status: 'PENDING'
        }
      });

      return res.status(200).json({
        success: true,
        status: 'PARKED_IN_SUSPENSE',
        message: `Account number ${accountNumber} not recognized. Payment of ₦${(amountKobo / 100).toLocaleString()} parked safely in Suspense Queue for manual bursar review.`,
        suspenseTransaction: suspenseItem
      });
    }

    const student = virtualAccount.student;
    schoolId = student.schoolId;

    // 3. Invoice Matching: Find the student's oldest open invoice (UNPAID or PART_PAID)
    const openInvoice = await prisma.invoice.findFirst({
      where: {
        studentId: student.id,
        status: { in: ['UNPAID', 'PART_PAID'] }
      },
      orderBy: { createdAt: 'asc' },
      include: { items: true }
    });

    // Exception Case B: Student exists but has no open invoices
    if (!openInvoice) {
      const suspenseItem = await prisma.suspenseTransaction.create({
        data: {
          schoolId,
          transactionReference,
          senderName: senderName || `${student.firstName} ${student.lastName} (Parent Transfer)`,
          attemptedAccountNumber: accountNumber,
          amountKobo,
          reason: 'NO_OPEN_INVOICE',
          status: 'PENDING'
        }
      });

      return res.status(200).json({
        success: true,
        status: 'PARKED_IN_SUSPENSE',
        message: `Payment received for ${student.firstName} ${student.lastName}, but no pending invoices exist. Parked in Suspense Queue.`,
        suspenseTransaction: suspenseItem
      });
    }

    // 4. Calculation: Update amount paid and determine new status
    const previousAmountPaidKobo = openInvoice.amountPaidKobo;
    const newAmountPaidKobo = previousAmountPaidKobo + amountKobo;

    const newStatus =
      newAmountPaidKobo >= openInvoice.totalAmountKobo ? 'PAID' : 'PART_PAID';

    // 5. Atomic Transaction: Execute Invoice update and Payment creation together
    const [updatedInvoice, paymentRecord] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id: openInvoice.id },
        data: {
          amountPaidKobo: newAmountPaidKobo,
          status: newStatus
        }
      }),
      prisma.payment.create({
        data: {
          invoiceId: openInvoice.id,
          transactionReference,
          amountKobo,
          paymentMethod: 'BANK_TRANSFER'
        }
      })
    ], { timeout: 30000, maxWait: 15000 });

    return res.status(200).json({
      success: true,
      message: 'Payment successfully reconciled via webhook',
      reconciliation: {
        studentName: `${student.firstName} ${student.lastName}`,
        accountNumber,
        transactionReference,
        invoiceId: updatedInvoice.id,
        term: updatedInvoice.term,
        paymentAmountKobo: amountKobo,
        paymentAmountNaira: amountKobo / 100,
        previousAmountPaidKobo,
        newTotalAmountPaidKobo: updatedInvoice.amountPaidKobo,
        totalInvoiceAmountKobo: updatedInvoice.totalAmountKobo,
        remainingBalanceKobo: Math.max(0, updatedInvoice.totalAmountKobo - updatedInvoice.amountPaidKobo),
        status: updatedInvoice.status
      },
      payment: paymentRecord
    });
  } catch (error) {
    return res.status(500).json({ error: 'Reconciliation webhook failed', details: error.message });
  }
};

/**
 * Get all unallocated suspense transactions for a school
 * GET /api/schools/:schoolId/suspense
 */
export const getSuspenseTransactions = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const suspenseItems = await prisma.suspenseTransaction.findMany({
      where: {
        schoolId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalUnallocatedKobo = suspenseItems.reduce((sum, item) => sum + item.amountKobo, 0);

    return res.status(200).json({
      message: 'Suspense queue transactions fetched successfully',
      count: suspenseItems.length,
      totalUnallocatedKobo,
      totalUnallocatedNaira: totalUnallocatedKobo / 100,
      data: suspenseItems
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch suspense transactions', details: error.message });
  }
};

/**
 * Manually allocate a suspense transaction to an enrolled student
 * POST /api/suspense/:id/allocate
 * Body: { studentId }
 */
export const allocateSuspenseTransaction = async (req, res) => {
  try {
    const id = req.params.id || req.body.suspenseId;
    const studentId = req.body.studentId || req.body.targetStudentId;

    if (!id || !studentId) {
      return res.status(400).json({ error: 'Both suspense transaction ID and target studentId are required for manual allocation.' });
    }

    const suspenseItem = await prisma.suspenseTransaction.findUnique({
      where: { id }
    });

    if (!suspenseItem) {
      return res.status(404).json({ error: 'Suspense transaction not found.' });
    }

    if (suspenseItem.status === 'ALLOCATED') {
      return res.status(400).json({ error: 'This transaction has already been allocated.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Target student not found.' });
    }

    if (req.user?.schoolId && (suspenseItem.schoolId !== req.user.schoolId || student.schoolId !== req.user.schoolId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You can only allocate suspense deposits within your own school.'
      });
    }

    // Execute allocation inside a single atomic database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create an open invoice for student
      let openInvoice = await tx.invoice.findFirst({
        where: {
          studentId: student.id,
          status: { in: ['UNPAID', 'PART_PAID'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!openInvoice) {
        // Create an initial invoice if none open
        openInvoice = await tx.invoice.create({
          data: {
            studentId: student.id,
            schoolId: student.schoolId,
            term: 'First Term',
            academicSession: '2026/2027',
            totalAmountKobo: 12000000,
            amountPaidKobo: 0,
            status: 'UNPAID',
            dueDate: new Date('2026-10-31'),
            items: {
              create: [
                {
                  description: 'Tuition Fee',
                  amountKobo: 12000000
                }
              ]
            }
          }
        });
      }

      // 2. Create Payment record using suspense reference & amount
      const paymentRecord = await tx.payment.create({
        data: {
          invoiceId: openInvoice.id,
          transactionReference: suspenseItem.transactionReference,
          amountKobo: suspenseItem.amountKobo,
          paymentMethod: 'BANK_TRANSFER'
        }
      });

      // 3. Update invoice balance and status
      const newAmountPaidKobo = openInvoice.amountPaidKobo + suspenseItem.amountKobo;
      const newStatus = newAmountPaidKobo >= openInvoice.totalAmountKobo ? 'PAID' : 'PART_PAID';

      const updatedInvoice = await tx.invoice.update({
        where: { id: openInvoice.id },
        data: {
          amountPaidKobo: newAmountPaidKobo,
          status: newStatus
        }
      });

      // 4. Update SuspenseTransaction status
      const updatedSuspense = await tx.suspenseTransaction.update({
        where: { id: suspenseItem.id },
        data: {
          status: 'ALLOCATED',
          allocatedStudentId: student.id
        }
      });

      return {
        student,
        invoice: updatedInvoice,
        payment: paymentRecord,
        suspense: updatedSuspense
      };
    }, { timeout: 30000, maxWait: 15000 });

    return res.status(200).json({
      success: true,
      message: `Successfully allocated ₦${(suspenseItem.amountKobo / 100).toLocaleString()} to ${student.firstName} ${student.lastName}`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({ error: 'Manual allocation failed', details: error.message });
  }
};

/**
 * Get all payment installments for a specific invoice
 * GET /api/invoices/:invoiceId/payments
 */
export const getInvoicePayments = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { schoolId: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    if (req.user?.schoolId && invoice.schoolId !== req.user.schoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You do not have permission to view payments for an invoice from another school.'
      });
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: 'desc' }
    });

    return res.status(200).json({
      message: 'Invoice payments retrieved successfully',
      count: payments.length,
      data: payments
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch invoice payments', details: error.message });
  }
};

/**
 * Record Physical Cash Payment at Bursar Office Counter
 * POST /api/payments/cash
 * Body: { studentId, amountNaira, receiptNumber, note, date }
 */
export const recordCashPayment = async (req, res) => {
  try {
    const { studentId, amountNaira, receiptNumber, note, date } = req.body;

    if (!studentId || !amountNaira || Number(amountNaira) <= 0) {
      return res.status(400).json({ error: 'studentId and valid amountNaira are required.' });
    }

    const amountKobo = Math.round(Number(amountNaira) * 100);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (req.user?.schoolId && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You cannot record cash payments for a student from another school.'
      });
    }

    const transactionReference = receiptNumber ? `CASH_${receiptNumber.trim()}` : `CASH_${Date.now()}`;

    // Execute Cash Payment in Single Atomic Database Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find open invoice or create initial invoice
      let openInvoice = await tx.invoice.findFirst({
        where: {
          studentId: student.id,
          status: { in: ['UNPAID', 'PART_PAID'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!openInvoice) {
        openInvoice = await tx.invoice.create({
          data: {
            studentId: student.id,
            schoolId: student.schoolId,
            term: 'First Term',
            academicSession: '2026/2027',
            totalAmountKobo: amountKobo,
            amountPaidKobo: 0,
            status: 'UNPAID',
            dueDate: new Date('2026-10-31'),
            items: {
              create: [
                {
                  description: 'Tuition / Fees Adjustment',
                  amountKobo
                }
              ]
            }
          }
        });
      }

      // Create Payment record
      const paymentRecord = await tx.payment.create({
        data: {
          invoiceId: openInvoice.id,
          transactionReference,
          amountKobo,
          paymentMethod: 'CASH',
          paidAt: date ? new Date(date) : new Date(),
          recordedByStaffId: req.user?.id || req.body?.staffId || req.body?.bursarId || null,
          isCashRemitted: false
        }
      });

      // Update invoice amount paid and status
      const newAmountPaidKobo = openInvoice.amountPaidKobo + amountKobo;
      const newStatus = newAmountPaidKobo >= openInvoice.totalAmountKobo ? 'PAID' : 'PART_PAID';

      const updatedInvoice = await tx.invoice.update({
        where: { id: openInvoice.id },
        data: {
          amountPaidKobo: newAmountPaidKobo,
          status: newStatus
        }
      });

      return {
        student,
        invoice: updatedInvoice,
        payment: paymentRecord
      };
    }, { timeout: 30000, maxWait: 15000 });

    return res.status(200).json({
      success: true,
      message: `Successfully logged cash payment of ₦${Number(amountNaira).toLocaleString()} for ${student.firstName} ${student.lastName}`,
      data: result
    });
  } catch (error) {
    return res.status(500).json({ error: 'Cash payment recording failed', details: error.message });
  }
};

/**
 * Get all transactions across the school (Audit Stream)
 * GET /api/schools/:schoolId/transactions
 */
export const getAllTransactions = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const payments = await prisma.payment.findMany({
      where: {
        invoice: {
          schoolId
        }
      },
      include: {
        invoice: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                classGrade: true,
                parentName: true,
                parentPhone: true
              }
            }
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    return res.status(200).json({
      message: 'All school transactions fetched successfully',
      count: payments.length,
      data: payments
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch transactions stream', details: error.message });
  }
};



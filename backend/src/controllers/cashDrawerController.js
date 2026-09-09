/**
 * Daily Cash Drawer & Custody Handover Controller for BURSA
 * Resolves trust issues around physical cash collections in Nigerian private schools
 * using a dual-control (Maker-Checker) custody verification engine.
 */

import { prisma } from '../config/db.js';

/**
 * Get active unremitted physical cash drawer for a school
 * GET /api/schools/:schoolId/cash-drawer/current
 */
export const getCurrentCashDrawer = async (req, res) => {
  try {
    const schoolId = req.params.schoolId || req.user?.schoolId;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required.' });
    }

    // Find all cash payments where isCashRemitted is false
    const unremittedPayments = await prisma.payment.findMany({
      where: {
        invoice: { schoolId },
        paymentMethod: 'CASH',
        isCashRemitted: false,
        cashHandoverId: null // not yet batched into a closeout
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
                admissionNumber: true,
                parentName: true,
                parentPhone: true
              }
            }
          }
        },
        recordedByStaff: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    const unremittedTotalKobo = unremittedPayments.reduce(
      (sum, pmt) => sum + pmt.amountKobo,
      0
    );

    return res.status(200).json({
      success: true,
      unremittedTotalKobo,
      unremittedCount: unremittedPayments.length,
      transactions: unremittedPayments
    });
  } catch (error) {
    console.error('Error fetching current cash drawer:', error);
    return res.status(500).json({
      error: 'Failed to retrieve current cash drawer',
      details: error.message
    });
  }
};

/**
 * End-of-Day Shift Closeout: Submit unremitted cash batch to Proprietor
 * POST /api/schools/:schoolId/cash-drawer/close
 * Body: { notes?, depositSlipUrl? }
 * Protected: Bursar role
 */
export const closeCashDrawer = async (req, res) => {
  try {
    const schoolId = req.params.schoolId || req.user?.schoolId;
    const bursarId = req.user?.id;
    const { notes, depositSlipUrl } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required.' });
    }

    if (!bursarId) {
      return res.status(401).json({ error: 'Authenticated staff session is required.' });
    }

    // 1. Gather all unremitted cash payments that have not been batched
    const unremittedPayments = await prisma.payment.findMany({
      where: {
        invoice: { schoolId },
        paymentMethod: 'CASH',
        isCashRemitted: false,
        cashHandoverId: null
      }
    });

    if (unremittedPayments.length === 0) {
      return res.status(400).json({
        error: 'No unremitted cash payments currently in drawer to close out.'
      });
    }

    const totalKobo = unremittedPayments.reduce((sum, p) => sum + p.amountKobo, 0);

    // 2. Create CashHandover batch and link payments atomically
    const handover = await prisma.$transaction(async (tx) => {
      const newHandover = await tx.cashHandover.create({
        data: {
          schoolId,
          bursarId,
          amountKobo: totalKobo,
          receiptCount: unremittedPayments.length,
          status: 'PENDING_VERIFICATION',
          notes: notes ? String(notes).trim() : null,
          depositSlipUrl: depositSlipUrl ? String(depositSlipUrl).trim() : null
        }
      });

      // Link payment records to this batch (isCashRemitted remains false until Proprietor confirms)
      await tx.payment.updateMany({
        where: {
          id: { in: unremittedPayments.map((p) => p.id) }
        },
        data: {
          cashHandoverId: newHandover.id
        }
      });

      return newHandover;
    }, { timeout: 30000, maxWait: 15000 });

    return res.status(201).json({
      success: true,
      message: `Cash closeout of ₦${(totalKobo / 100).toLocaleString()} (${unremittedPayments.length} receipts) submitted to Proprietor for verification.`,
      handover
    });
  } catch (error) {
    console.error('Error closing cash drawer:', error);
    return res.status(500).json({
      error: 'Failed to close cash drawer batch',
      details: error.message
    });
  }
};

/**
 * Proprietor confirms physical cash receipt or bank deposit
 * POST /api/schools/:schoolId/cash-drawer/:handoverId/confirm
 * Protected: PROPRIETOR role only
 */
export const confirmCashHandover = async (req, res) => {
  try {
    const schoolId = req.params.schoolId || req.user?.schoolId;
    const { handoverId } = req.params;
    const proprietorId = req.user?.id;

    if (!handoverId) {
      return res.status(400).json({ error: 'Handover ID is required.' });
    }

    // 1. Verify handover batch exists and is pending verification
    const handover = await prisma.cashHandover.findUnique({
      where: { id: handoverId },
      include: {
        bursar: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        payments: true
      }
    });

    if (!handover) {
      return res.status(404).json({ error: 'Cash handover record not found.' });
    }

    if (handover.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Handover does not belong to this school.' });
    }

    if (handover.status === 'CONFIRMED_BY_PROPRIETOR') {
      return res.status(400).json({
        error: 'This cash handover has already been confirmed and sealed by the Proprietor.'
      });
    }

    // 2. Dual-control confirmation: mark handover confirmed and remit linked payments
    const confirmedHandover = await prisma.$transaction(async (tx) => {
      const updatedHandover = await tx.cashHandover.update({
        where: { id: handoverId },
        data: {
          status: 'CONFIRMED_BY_PROPRIETOR',
          confirmedByProprietorId: proprietorId,
          confirmedAt: new Date()
        },
        include: {
          bursar: {
            select: { fullName: true }
          },
          confirmedByProprietor: {
            select: { fullName: true }
          }
        }
      });

      // Mark all linked cash payments as officially remitted into school treasury
      await tx.payment.updateMany({
        where: { cashHandoverId: handoverId },
        data: { isCashRemitted: true }
      });

      return updatedHandover;
    }, { timeout: 30000, maxWait: 15000 });

    return res.status(200).json({
      success: true,
      message: `Physical cash custody of ₦${(confirmedHandover.amountKobo / 100).toLocaleString()} successfully confirmed and remitted.`,
      handover: confirmedHandover
    });
  } catch (error) {
    console.error('Error confirming cash handover:', error);
    return res.status(500).json({
      error: 'Failed to confirm cash handover',
      details: error.message
    });
  }
};

/**
 * Get all cash handovers for a school (Pending & Confirmed history)
 * GET /api/schools/:schoolId/cash-drawer/handovers
 */
export const getSchoolHandovers = async (req, res) => {
  try {
    const schoolId = req.params.schoolId || req.user?.schoolId;
    const { status } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required.' });
    }

    const whereClause = { schoolId };
    if (status) {
      whereClause.status = status;
    }

    const handovers = await prisma.cashHandover.findMany({
      where: whereClause,
      include: {
        bursar: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        confirmedByProprietor: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        payments: {
          include: {
            invoice: {
              include: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    classGrade: true,
                    admissionNumber: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      count: handovers.length,
      handovers
    });
  } catch (error) {
    console.error('Error fetching cash handovers:', error);
    return res.status(500).json({
      error: 'Failed to retrieve cash handovers',
      details: error.message
    });
  }
};

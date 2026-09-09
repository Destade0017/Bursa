/**
 * Invoice Controller
 * Manages invoice creation, line items, and invoice retrieval for students and schools.
 */

import { prisma } from '../config/db.js';

/**
 * Create a new fee invoice with line items
 * POST /api/invoices
 */
export const createInvoice = async (req, res) => {
  try {
    const { studentId, term, academicSession, items, dueDate } = req.body;

    if (!studentId || !term || !academicSession || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'studentId, term, academicSession, and a non-empty items array are required.'
      });
    }

    // 1. Verify student exists and get schoolId
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (req.user?.schoolId && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You cannot create invoices for a student from another school.'
      });
    }

    // 2. Process items: convert Naira to Kobo (Naira * 100) and calculate total
    let totalAmountKobo = 0;
    const itemsData = items.map((item) => {
      const amountKobo = Math.round(Number(item.amountNaira) * 100);
      totalAmountKobo += amountKobo;
      return {
        description: item.description,
        amountKobo
      };
    });

    // 3. Create Invoice and InvoiceItems in a single atomic transaction via nested write
    const invoice = await prisma.invoice.create({
      data: {
        studentId,
        schoolId: student.schoolId,
        term,
        academicSession,
        totalAmountKobo,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: {
          create: itemsData
        }
      },
      include: {
        items: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classGrade: true
          }
        }
      }
    });

    return res.status(201).json({
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
};

/**
 * Get all invoices for a specific student
 * GET /api/students/:studentId/invoices
 */
export const getStudentInvoices = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, schoolId: true }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (req.user?.schoolId && student.schoolId !== req.user.schoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You do not have permission to view invoices for a student from another school.'
      });
    }

    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      include: {
        items: true,
        school: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      message: 'Student invoices retrieved successfully',
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch student invoices', details: error.message });
  }
};

/**
 * Get all invoices for a school (with optional status filter)
 * GET /api/schools/:schoolId/invoices?status=UNPAID
 */
export const getSchoolInvoices = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { status } = req.query;

    const whereClause = { schoolId };
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            classGrade: true,
            parentName: true,
            parentPhone: true
          }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      message: 'School invoices retrieved successfully',
      count: invoices.length,
      filterStatus: status || 'ALL',
      data: invoices
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch school invoices', details: error.message });
  }
};

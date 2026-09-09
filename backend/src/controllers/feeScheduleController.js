/**
 * Fee Schedule & Mass Invoicing Controller for BURSA
 * Enables schools to configure class-level fee structures and generate
 * term invoices in bulk for all enrolled students atomically.
 */

import { prisma } from '../config/db.js';

/**
 * Create or update a class fee schedule with line items
 * POST /api/fee-schedules
 * Body: { schoolId?, classGrade, term, academicSession, items: [{ description, amountNaira }] }
 */
export const createOrUpdateFeeSchedule = async (req, res) => {
  try {
    const { items } = req.body;
    const targetSchoolId = req.body.schoolId || req.params.schoolId || req.user?.schoolId;

    if (!targetSchoolId) {
      return res.status(400).json({ error: 'School ID is required.' });
    }

    if (req.user?.schoolId && targetSchoolId !== req.user.schoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You cannot configure fee schedules for another school.'
      });
    }

    const schoolId = req.user?.schoolId || targetSchoolId;

    const classGrade = req.body.classGrade ? String(req.body.classGrade).trim() : '';
    const term = req.body.term ? String(req.body.term).trim() : '';
    const academicSession = req.body.academicSession ? String(req.body.academicSession).trim() : '';

    if (!classGrade || !term || !academicSession) {
      return res.status(400).json({
        error: 'classGrade, term, and academicSession are required fields.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'At least one fee line item is required.'
      });
    }

    // Validate line items, convert amounts from Naira to Kobo, and calculate total
    let totalAmountKobo = 0;
    const itemsData = [];

    for (const item of items) {
      const description = String(item.description || '').trim();
      if (!description) {
        return res.status(400).json({
          error: 'Each line item must have a valid description.'
        });
      }

      const amountNaira = Number(item.amountNaira);
      if (isNaN(amountNaira) || amountNaira <= 0) {
        return res.status(400).json({
          error: `Invalid amount for item "${description}". Amount must be a positive number greater than 0.`
        });
      }

      const amountKobo = Math.round(amountNaira * 100);
      totalAmountKobo += amountKobo;
      itemsData.push({
        description,
        amountKobo
      });
    }

    // Atomic upsert targeted by the composite unique key (schoolId, classGrade, term, academicSession)
    const feeSchedule = await prisma.feeSchedule.upsert({
      where: {
        schoolId_classGrade_term_academicSession: {
          schoolId,
          classGrade,
          term,
          academicSession
        }
      },
      update: {
        totalAmountKobo,
        items: {
          deleteMany: {},
          create: itemsData
        }
      },
      create: {
        schoolId,
        classGrade,
        term,
        academicSession,
        totalAmountKobo,
        items: {
          create: itemsData
        }
      },
      include: {
        items: true
      }
    });

    return res.status(200).json({
      success: true,
      message: `Fee schedule for ${classGrade} (${term} ${academicSession}) saved successfully.`,
      data: feeSchedule
    });
  } catch (error) {
    console.error('Error creating/updating fee schedule:', error);
    return res.status(500).json({
      error: 'Failed to configure fee schedule',
      details: error.message
    });
  }
};

/**
 * Get all fee schedules configured for a school, with optional term & session filter
 * GET /api/schools/:schoolId/fee-schedules
 * GET /api/fee-schedules
 */
export const getSchoolFeeSchedules = async (req, res) => {
  try {
    const term = req.query.term ? String(req.query.term).trim() : undefined;
    const academicSession = req.query.academicSession ? String(req.query.academicSession).trim() : undefined;
    const targetSchoolId = req.params.schoolId || req.query.schoolId || req.user?.schoolId;

    if (!targetSchoolId) {
      return res.status(400).json({ error: 'School ID is required.' });
    }

    if (req.user?.schoolId && targetSchoolId !== req.user.schoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You cannot view fee schedules for another school.'
      });
    }

    const schoolId = req.user?.schoolId || targetSchoolId;

    const whereClause = { schoolId };
    if (term) whereClause.term = term;
    if (academicSession) whereClause.academicSession = academicSession;

    const feeSchedules = await prisma.feeSchedule.findMany({
      where: whereClause,
      include: {
        items: true
      },
      orderBy: [
        { classGrade: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return res.status(200).json({
      success: true,
      count: feeSchedules.length,
      data: feeSchedules
    });
  } catch (error) {
    console.error('Error fetching fee schedules:', error);
    return res.status(500).json({
      error: 'Failed to retrieve fee schedules',
      details: error.message
    });
  }
};

/**
 * Delete a class fee schedule
 * DELETE /api/fee-schedules/:id
 * DELETE /api/schools/:schoolId/fee-schedules/:id
 */
export const deleteFeeSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const targetSchoolId = req.params.schoolId || req.query.schoolId || req.user?.schoolId;

    if (!id) {
      return res.status(400).json({ error: 'Fee Schedule ID is required.' });
    }

    const feeSchedule = await prisma.feeSchedule.findUnique({
      where: { id }
    });

    if (!feeSchedule) {
      return res.status(404).json({ error: 'Fee Schedule not found.' });
    }

    // Tenant isolation verification
    if (req.user?.schoolId && feeSchedule.schoolId !== req.user.schoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: You cannot delete a fee schedule from another school.'
      });
    }

    if (targetSchoolId && feeSchedule.schoolId !== targetSchoolId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: Fee schedule does not belong to the specified school.'
      });
    }

    await prisma.feeSchedule.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: `Fee schedule for ${feeSchedule.classGrade} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting fee schedule:', error);
    return res.status(500).json({
      error: 'Failed to delete fee schedule',
      details: error.message
    });
  }
};

/**
 * 1-Click Mass Term Invoicing
 * Generates itemized term invoices for all enrolled students based on their class fee schedule.
 * POST /api/schools/:schoolId/invoices/generate-mass
 * Body: { term, academicSession, dueDate? }
 */
export const generateMassTermInvoices = async (req, res) => {
  try {
    const schoolId = req.params.schoolId || req.user?.schoolId;
    const term = req.body.term ? String(req.body.term).trim() : '';
    const academicSession = req.body.academicSession ? String(req.body.academicSession).trim() : '';
    const dueDate = req.body.dueDate;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required.' });
    }

    if (!term || !academicSession) {
      return res.status(400).json({
        error: 'Both "term" and "academicSession" are required for mass invoice generation.'
      });
    }

    // 1. Fetch all active students in the school
    const students = await prisma.student.findMany({
      where: { schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classGrade: true
      }
    });

    if (students.length === 0) {
      return res.status(400).json({
        error: 'No students found for this school. Please enroll students first.'
      });
    }

    // 2. Fetch all fee schedules configured for this school, term, and academic session
    const feeSchedules = await prisma.feeSchedule.findMany({
      where: {
        schoolId,
        term,
        academicSession
      },
      include: {
        items: true
      }
    });

    if (feeSchedules.length === 0) {
      return res.status(400).json({
        error: `No fee schedules configured for ${term} ${academicSession}. Please configure class fee schedules first.`
      });
    }

    // Map fee schedules by normalized classGrade for case-insensitive and trimmed lookup
    const scheduleByClass = new Map();
    feeSchedules.forEach((sched) => {
      const normalizedClass = (sched.classGrade || '').trim().toLowerCase();
      scheduleByClass.set(normalizedClass, sched);
    });

    // 3. Find students who already have an invoice for this specific term and session
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        schoolId,
        term,
        academicSession
      },
      select: {
        studentId: true
      }
    });

    const alreadyBilledStudentIds = new Set(existingInvoices.map((inv) => inv.studentId));

    // 4. Identify students to bill vs students to skip
    const toBill = [];
    const skipped = [];
    let alreadyBilledCount = 0;

    for (const student of students) {
      if (alreadyBilledStudentIds.has(student.id)) {
        alreadyBilledCount += 1;
        continue;
      }

      const normalizedStudentClass = (student.classGrade || '').trim().toLowerCase();
      const schedule = scheduleByClass.get(normalizedStudentClass);
      if (!schedule) {
        skipped.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          classGrade: student.classGrade,
          reason: `No fee schedule configured for class "${student.classGrade}".`
        });
        continue;
      }

      toBill.push({ student, schedule });
    }

    // 5. Execute invoice and line items generation inside an atomic database transaction
    const parsedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days

    const createdInvoices = await prisma.$transaction(async (tx) => {
      const generated = [];

      for (const { student, schedule } of toBill) {
        const newInvoice = await tx.invoice.create({
          data: {
            studentId: student.id,
            schoolId,
            term,
            academicSession,
            totalAmountKobo: schedule.totalAmountKobo,
            amountPaidKobo: 0,
            status: 'UNPAID',
            dueDate: parsedDueDate,
            items: {
              create: schedule.items.map((item) => ({
                description: item.description,
                amountKobo: item.amountKobo
              }))
            }
          },
          include: {
            items: true
          }
        });

        generated.push(newInvoice);
      }

      return generated;
    }, { timeout: 30000, maxWait: 15000 });

    return res.status(200).json({
      success: true,
      message: `Mass billing completed. Generated ${createdInvoices.length} invoices.`,
      generatedCount: createdInvoices.length,
      skippedCount: skipped.length,
      alreadyBilledCount,
      skipped
    });
  } catch (error) {
    console.error('Error during mass invoice generation:', error);
    return res.status(500).json({
      error: 'Mass invoice generation failed',
      details: error.message
    });
  }
};

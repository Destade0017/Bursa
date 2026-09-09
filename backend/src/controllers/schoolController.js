/**
 * School and Student Controller
 * Manages database operations for schools and their associated students.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { createDedicatedVirtualAccount } from '../services/paystackService.js';
import { generateSchoolSlug } from './authController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');


/**
 * Create a new school record
 * POST /api/schools
 */
export const createSchool = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Name, phone, and email are required.' });
    }

    const slug = await generateSchoolSlug(name);

    const school = await prisma.school.create({
      data: { name, slug, phone, email }
    });

    return res.status(201).json({
      message: 'School created successfully',
      data: school
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A school with this email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create school', details: error.message });
  }
};

/**
 * Get all registered schools
 * GET /api/schools
 */
export const getSchools = async (req, res) => {
  try {
    // If authenticated user belongs to a specific school, scope response to their school
    const filter = req.user?.schoolId ? { where: { id: req.user.schoolId } } : {};

    const schools = await prisma.school.findMany({
      ...filter,
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      message: 'Schools retrieved successfully',
      data: schools
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch schools', details: error.message });
  }
};

/**
 * Create a student linked to a school
 * POST /api/schools/:schoolId/students
 *
 * After creating the student + DVA, automatically looks up the school's
 * FeeSchedule for the student's classGrade / currentTerm / academicSession.
 * If a schedule is found, an Invoice with InvoiceItems is created so that
 * Payment Progress on the roster shows ₦0 / <class fee> immediately.
 */
export const createStudent = async (req, res) => {
  try {
    const schoolId = req.params.schoolId || req.body.schoolId;
    const { firstName, lastName, classGrade, parentName, parentPhone } = req.body;

    if (!schoolId || !firstName || !lastName || !classGrade || !parentName || !parentPhone) {
      return res.status(400).json({
        error: 'schoolId, firstName, lastName, classGrade, parentName, and parentPhone are required.'
      });
    }

    // Verify school exists
    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // Provision DVA via Paystack Service (or MOCK fallback)
    // Done BEFORE the transaction to avoid holding DB locks during external API calls
    const dvaInfo = await createDedicatedVirtualAccount({
      firstName,
      lastName,
      phone: parentPhone
    });

    // Look up FeeSchedule for this class (case-insensitive, trim-safe) using school's current term/session
    const normalizedClass = classGrade.trim().toLowerCase();
    const term = schoolExists.currentTerm || 'First Term';
    const academicSession = schoolExists.academicSession || '2026/2027';

    const feeSchedules = await prisma.feeSchedule.findMany({
      where: { schoolId },
      include: { items: true }
    });

    const matchingSchedule = feeSchedules.find(
      (s) => s.classGrade.trim().toLowerCase() === normalizedClass &&
             s.term === term &&
             s.academicSession === academicSession
    ) || feeSchedules.find(
      // Fallback: any schedule for this class regardless of term/session
      (s) => s.classGrade.trim().toLowerCase() === normalizedClass
    ) || null;

    // Atomically create: Student → DVA → Invoice (if schedule found)
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          schoolId,
          firstName,
          lastName,
          classGrade,
          parentName,
          parentPhone,
          virtualAccount: {
            create: {
              accountNumber: dvaInfo.accountNumber,
              bankName: dvaInfo.bankName,
              accountName: `${schoolExists.name} / ${firstName} ${lastName}`
            }
          }
        },
        include: {
          virtualAccount: true
        }
      });

      let invoice = null;

      if (matchingSchedule) {
        invoice = await tx.invoice.create({
          data: {
            studentId: student.id,
            schoolId,
            term: matchingSchedule.term,
            academicSession: matchingSchedule.academicSession,
            totalAmountKobo: matchingSchedule.totalAmountKobo,
            amountPaidKobo: 0,
            status: 'UNPAID',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            items: {
              create: matchingSchedule.items.map((item) => ({
                description: item.description,
                amountKobo: item.amountKobo
              }))
            }
          }
        });
      }

      return { student, invoice };
    });

    return res.status(201).json({
      message: matchingSchedule
        ? `Student registered with Virtual Account and ₦${(matchingSchedule.totalAmountKobo / 100).toLocaleString()} invoice for ${classGrade}.`
        : 'Student registered with Virtual Account. No fee schedule found for this class — invoice not created.',
      invoiceCreated: !!matchingSchedule,
      data: result.student,
      invoice: result.invoice
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create student', details: error.message });
  }
};

/**
 * Get all students for a specific school
 * GET /api/schools/:schoolId/students
 */
export const getStudentsBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        students: {
          include: {
            virtualAccount: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    return res.status(200).json({
      message: 'Students retrieved successfully',
      schoolName: school.name,
      count: school.students.length,
      data: school.students
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
};

/**
 * Bulk Create Students and assign DVAs & Invoices from CSV Roster
 * POST /api/schools/:schoolId/students/bulk
 */
export const bulkCreateStudents = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { students: rawStudents } = req.body;

    if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
      return res.status(400).json({ error: 'A non-empty students array is required for bulk import.' });
    }

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // Filter valid rows: require firstName, lastName, parentPhone
    const validStudents = rawStudents.filter(
      (s) => s.firstName && s.lastName && s.parentPhone
    );

    if (validStudents.length === 0) {
      return res.status(400).json({
        error: 'No valid student records found. Each record must contain firstName, lastName, and parentPhone.'
      });
    }

    // 1. Pre-process roster records and provision DVAs BEFORE opening database transaction
    // Prevents external network latencies (Paystack API calls) from holding DB locks or causing transaction timeouts
    const preparedRoster = [];
    for (const item of validStudents) {
      const firstName = String(item.firstName).trim();
      const lastName = String(item.lastName).trim();
      let parentPhone = String(item.parentPhone).trim();

      // Restore leading zero if phone was parsed as a 10-digit number like 8066360787
      if (parentPhone.length === 10 && !parentPhone.startsWith('0')) {
        parentPhone = '0' + parentPhone;
      }

      const classGrade = item.classGrade ? String(item.classGrade).trim() : 'JSS 1';
      const parentName = item.parentName ? String(item.parentName).trim() : `Mr/Mrs ${lastName}`;
      const feeNaira = Number(item.feeAmountNaira) > 0 ? Number(item.feeAmountNaira) : 120000;
      const totalAmountKobo = Math.round(feeNaira * 100);

      // Provision DVA via Paystack Service (or MOCK fallback)
      const dvaInfo = await createDedicatedVirtualAccount({
        firstName,
        lastName,
        phone: parentPhone
      });

      preparedRoster.push({
        firstName,
        lastName,
        parentPhone,
        classGrade,
        parentName,
        totalAmountKobo,
        dvaInfo
      });
    }

    // 2. Execute bulk creation inside an atomic database transaction with extended timeout for Neon
    const createdRecords = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of preparedRoster) {
        // 1. Create Student + DVA
        const student = await tx.student.create({
          data: {
            schoolId,
            firstName: item.firstName,
            lastName: item.lastName,
            classGrade: item.classGrade,
            parentName: item.parentName,
            parentPhone: item.parentPhone,
            virtualAccount: {
              create: {
                accountNumber: item.dvaInfo.accountNumber,
                bankName: item.dvaInfo.bankName,
                accountName: `${schoolExists.name} / ${item.firstName} ${item.lastName}`
              }
            }
          },
          include: {
            virtualAccount: true
          }
        });

        // 2. Create Initial Term Invoice if feeAmountNaira is specified (or default ₦120,000)
        const invoice = await tx.invoice.create({
          data: {
            studentId: student.id,
            schoolId,
            term: 'First Term',
            academicSession: '2026/2027',
            totalAmountKobo: item.totalAmountKobo,
            amountPaidKobo: 0,
            status: 'UNPAID',
            dueDate: new Date('2026-10-31'),
            items: {
              create: [
                {
                  description: 'Tuition Fee',
                  amountKobo: item.totalAmountKobo
                }
              ]
            }
          }
        });

        results.push({ student, invoice });
      }

      return results;
    }, { timeout: 30000, maxWait: 15000 });

    return res.status(201).json({
      success: true,
      count: createdRecords.length,
      message: `Roster imported successfully! Created ${createdRecords.length} students with DVAs and term invoices.`,
      data: createdRecords
    });
  } catch (error) {
    return res.status(500).json({ error: 'Bulk roster import failed', details: error.message });
  }
};

/**
 * Get School details by ID
 * GET /api/schools/:schoolId
 */
export const getSchoolById = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    return res.status(200).json({
      success: true,
      data: school
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch school details', details: error.message });
  }
};

/**
 * Update School General Profile & Finance Settings
 * PUT /api/schools/:schoolId
 */
export const updateSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const {
      name,
      email,
      phone,
      address,
      academicSession,
      currentTerm,
      bankName,
      accountNumber,
      accountName,
      currency,
      paymentRefFormat,
      receiptPrefix,
      receiptFooter
    } = req.body;

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return res.status(404).json({ error: 'School not found.' });
    }

    const updateData = {};
    if (name) updateData.name = String(name).trim();
    if (email) updateData.email = String(email).trim().toLowerCase();
    if (phone) updateData.phone = String(phone).trim();
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (req.body.logoUrl !== undefined) updateData.logoUrl = req.body.logoUrl ? String(req.body.logoUrl).trim() : null;
    if (academicSession) updateData.academicSession = String(academicSession).trim();
    if (currentTerm) updateData.currentTerm = String(currentTerm).trim();
    if (bankName !== undefined) updateData.bankName = bankName ? String(bankName).trim() : null;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber ? String(accountNumber).trim() : null;
    if (accountName !== undefined) updateData.accountName = accountName ? String(accountName).trim() : null;
    if (currency) updateData.currency = String(currency).trim();
    if (paymentRefFormat !== undefined) updateData.paymentRefFormat = paymentRefFormat ? String(paymentRefFormat).trim() : null;
    if (receiptPrefix !== undefined) updateData.receiptPrefix = receiptPrefix ? String(receiptPrefix).trim() : null;
    if (receiptFooter !== undefined) updateData.receiptFooter = receiptFooter ? String(receiptFooter).trim() : null;

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'School settings updated successfully.',
      data: updatedSchool
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A school with this email address already exists.' });
    }
    return res.status(500).json({ error: 'Failed to update school settings', details: error.message });
  }
};

/**
 * Upload or Replace School Logo
 * POST /api/schools/:schoolId/logo
 * Body: { logo: "data:image/png;base64,..." }
 */
export const uploadSchoolLogo = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { logo } = req.body;

    if (!logo || typeof logo !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Logo data string (Base64 or Data URI) is required.'
      });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // Parse Data URI e.g. "data:image/png;base64,iVBORw0KG..."
    const matches = logo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let base64Data = logo;

    if (matches && matches.length === 3) {
      mimeType = matches[1].toLowerCase();
      base64Data = matches[2];
    }

    // Supported MIME types
    const allowedMimeTypes = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/svg+xml': 'svg',
      'image/webp': 'webp'
    };

    if (!allowedMimeTypes[mimeType]) {
      return res.status(400).json({
        error: 'Unsupported File Format',
        message: `File type '${mimeType}' is not supported. Please upload a PNG, JPG, SVG, or WEBP image.`
      });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB limit

    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({
        error: 'File Too Large',
        message: `The uploaded image is ${(buffer.length / (1024 * 1024)).toFixed(2)}MB, which exceeds the 2MB limit.`
      });
    }

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const extension = allowedMimeTypes[mimeType];
    const filename = `school-logo-${schoolId}-${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    // Construct public access URL
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const logoUrl = `${protocol}://${host}/uploads/${filename}`;

    // Clean up old logo if it was a local upload
    if (school.logoUrl && school.logoUrl.includes('/uploads/school-logo-')) {
      try {
        const oldFilename = school.logoUrl.split('/uploads/')[1];
        if (oldFilename) {
          const oldPath = path.join(uploadsDir, oldFilename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      } catch (err) {
        console.warn('Could not remove previous logo file:', err.message);
      }
    }

    // Update database record
    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { logoUrl }
    });

    return res.status(200).json({
      success: true,
      message: 'School logo uploaded successfully.',
      logoUrl,
      data: updatedSchool
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Logo upload failed',
      details: error.message
    });
  }
};

/**
 * Remove School Logo
 * DELETE /api/schools/:schoolId/logo
 */
export const deleteSchoolLogo = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    if (school.logoUrl && school.logoUrl.includes('/uploads/school-logo-')) {
      try {
        const oldFilename = school.logoUrl.split('/uploads/')[1];
        if (oldFilename) {
          const oldPath = path.join(uploadsDir, oldFilename);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      } catch (err) {
        console.warn('Could not remove logo file:', err.message);
      }
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: { logoUrl: null }
    });

    return res.status(200).json({
      success: true,
      message: 'School logo removed successfully.',
      data: updatedSchool
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to remove school logo',
      details: error.message
    });
  }
};

/**
 * Connect or Edit School Settlement Bank Payout Account (PROPRIETOR Only)
 * POST /api/schools/:schoolId/connect-payout
 * Body: { bankName, accountNumber, accountName }
 */
export const connectPayoutAccount = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { bankName, accountNumber, accountName } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({
        error: 'bankName, accountNumber, and accountName are required.'
      });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        bankName: String(bankName).trim(),
        accountNumber: String(accountNumber).trim(),
        accountName: String(accountName).trim()
      }
    });

    return res.status(200).json({
      success: true,
      message: `Settlement payout bank account (${bankName} - ${accountNumber}) connected successfully for ${school.name}.`,
      data: updatedSchool
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect payout account', details: error.message });
  }
};

/**
 * Add / Invite a new Staff Member for a School
 * POST /api/schools/:schoolId/staff
 * Body: { fullName, email, phone, password, role }
 */
export const createStaffMember = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { fullName, email, phone, password, role } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        error: 'fullName, email, phone, and password are required to create a staff account.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Verify school exists
    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // Check if staff email already exists
    const existingStaff = await prisma.staff.findUnique({
      where: { email: cleanEmail }
    });

    if (existingStaff) {
      return res.status(400).json({
        error: 'A staff member with this email address already exists.'
      });
    }

    // Hash staff password
    const passwordHash = await bcrypt.hash(password, 10);
    const validRoles = ['PROPRIETOR', 'BURSAR', 'ACCOUNTANT', 'VIEWER'];
    const staffRole = role && validRoles.includes(role.toUpperCase())
      ? role.toUpperCase()
      : 'BURSAR';

    const staffMember = await prisma.staff.create({
      data: {
        schoolId,
        fullName: String(fullName).trim(),
        email: cleanEmail,
        phone: String(phone).trim(),
        passwordHash,
        role: staffRole
      },
      select: {
        id: true,
        schoolId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      success: true,
      message: `Staff member (${staffMember.fullName} - ${staffMember.role}) added successfully.`,
      data: staffMember
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create staff member', details: error.message });
  }
};

/**
 * Delete / Remove a Staff Member
 * DELETE /api/schools/:schoolId/staff/:staffId
 */
export const deleteStaffMember = async (req, res) => {
  try {
    const { schoolId, staffId } = req.params;

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    if (staff.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Forbidden: Staff member belongs to another school.' });
    }

    await prisma.staff.delete({ where: { id: staffId } });

    return res.status(200).json({
      success: true,
      message: `Staff member (${staff.fullName}) removed successfully.`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove staff member', details: error.message });
  }
};

/**
 * Get all staff members for a specific school
 * GET /api/schools/:schoolId/staff
 */
export const getSchoolStaff = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const staffList = await prisma.staff.findMany({
      where: { schoolId },
      select: {
        id: true,
        schoolId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({
      success: true,
      count: staffList.length,
      data: staffList
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch school staff roster', details: error.message });
  }
};



/**
 * Staff Authentication Controller for BURSA
 * Handles staff login, password comparison via bcryptjs, and JWT token issuance.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bursaros_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate a clean, URL-safe, unique slug from school name
 * E.g., "Radiance Bright Stars Academy" -> "radiance-bright-stars-academy"
 * If taken, appends a unique random hex suffix e.g. "crown-heights-a4b2"
 */
export const generateSchoolSlug = async (schoolName, txOrPrisma = prisma) => {
  const baseSlug = String(schoolName)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'school';

  const existing = await txOrPrisma.school.findUnique({
    where: { slug: baseSlug }
  });

  if (!existing) {
    return baseSlug;
  }

  let uniqueSlug = '';
  let isUnique = false;
  while (!isUnique) {
    const suffix = crypto.randomBytes(2).toString('hex');
    uniqueSlug = `${baseSlug}-${suffix}`;
    const collision = await txOrPrisma.school.findUnique({
      where: { slug: uniqueSlug }
    });
    if (!collision) {
      isUnique = true;
    }
  }

  return uniqueSlug;
};

/**
 * Extract first name from full name string, accounting for honorific titles
 * @param {string} fullName
 * @returns {string} First name or empty string
 */
export const extractFirstName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return '';
  const match = fullName.match(
    /^(Chief\s*\((?:Mrs|Dr)\.?\)|(?:Chief|Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Engr|Barr|Alhaji|Alhaja|Hajia|Pastor|Rev|Reverend|Deacon|Deaconess|Elder|Sir|Madam|Lady)\.?)(?:\s+|$)/i
  );
  const remainder = match ? fullName.slice(match[0].length).trim() : fullName.trim();
  const parts = remainder.split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[0] : '';
};

/**
 * Staff Login Controller
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Find staff user by email
    const staff = await prisma.staff.findUnique({
      where: { email: cleanEmail },
      include: { school: true }
    });

    if (!staff) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Compare hashed password with bcryptjs
    const isPasswordValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Sign JWT Token with user metadata
    const token = jwt.sign(
      {
        id: staff.id,
        schoolId: staff.schoolId,
        role: staff.role,
        fullName: staff.fullName,
        email: staff.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: staff.id,
        fullName: staff.fullName,
        firstName: extractFirstName(staff.fullName),
        email: staff.email,
        role: staff.role,
        schoolId: staff.schoolId,
        schoolName: staff.school?.name || 'School',
        schoolSlug: staff.school?.slug || '',
        school: staff.school
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Login authentication failed', details: error.message });
  }
};

/**
 * Get Currently Logged-in Staff Profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No active user session.' });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        schoolId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true
          }
        }
      }
    });

    if (!staff) {
      return res.status(404).json({ error: 'Staff user not found.' });
    }


    return res.status(200).json({
      success: true,
      user: {
        ...staff,
        firstName: extractFirstName(staff.fullName)
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
};

/**
 * Self-Service School Onboarding & Proprietor Registration
 * POST /api/auth/register-school
 * Body: { schoolName, schoolPhone, proprietorName, email, phone, password }
 */
export const registerSchool = async (req, res) => {
  try {
    const { schoolName, schoolPhone, proprietorName, email, phone, password } = req.body;

    // 1. Validation: Ensure all required fields are present
    if (!schoolName || !schoolPhone || !proprietorName || !email || !phone || !password) {
      return res.status(400).json({
        error: 'All fields (schoolName, schoolPhone, proprietorName, email, phone, password) are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 2. Check if staff or school with this email already exists (case-insensitive normalized check)
    const [existingStaff, existingSchool] = await Promise.all([
      prisma.staff.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } }
      }),
      prisma.school.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' } }
      })
    ]);

    if (existingStaff || existingSchool) {
      return res.status(400).json({
        error: 'A school is already registered with this official email address.'
      });
    }

    // 3. Database Transaction (prisma.$transaction)
    // Guarantees atomic execution: if staff password hashing or saving fails, school creation rolls back cleanly.
    const passwordHash = await bcrypt.hash(password, 10);

    const { school, staff } = await prisma.$transaction(async (tx) => {
      // Generate unique URL slug for the new school
      const slug = await generateSchoolSlug(schoolName, tx);

      // Create new School record
      const newSchool = await tx.school.create({
        data: {
          name: String(schoolName).trim(),
          slug,
          phone: String(schoolPhone).trim(),
          email: cleanEmail
        }
      });

      // Create first Staff record linked to newly created school's id (PROPRIETOR)
      const newStaff = await tx.staff.create({
        data: {
          schoolId: newSchool.id,
          fullName: String(proprietorName).trim(),
          email: cleanEmail,
          phone: String(phone).trim(),
          passwordHash,
          role: 'PROPRIETOR'
        }
      });

      return { school: newSchool, staff: newStaff };
    }, { timeout: 30000, maxWait: 15000 });

    // 4. Generate Auth Token (JWT)
    const token = jwt.sign(
      {
        id: staff.id,
        schoolId: school.id,
        role: 'PROPRIETOR',
        fullName: staff.fullName,
        email: staff.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 5. Return 201 Created response
    return res.status(201).json({
      success: true,
      message: 'School and Administrator account created successfully!',
      token,
      user: {
        id: staff.id,
        fullName: staff.fullName,
        firstName: extractFirstName(staff.fullName),
        email: staff.email,
        role: 'PROPRIETOR',
        schoolId: school.id,
        schoolName: school.name,
        schoolSlug: school.slug
      },
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A school is already registered with this official email address.' });
    }
    return res.status(500).json({ error: 'School registration failed', details: error.message });
  }
};

/**
 * Self-Service Change Password for Authenticated Staff
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User session required.' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both currentPassword and newPassword are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const staff = await prisma.staff.findUnique({ where: { id: userId } });
    if (!staff) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password entered is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.staff.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update password', details: error.message });
  }
};


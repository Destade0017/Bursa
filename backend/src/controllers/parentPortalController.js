/**
 * Parent Self-Service Portal Controller for BURSA
 * Provides unauthenticated, privacy-sanitized, rate-limited public endpoints
 * for parents to look up their child's live fee balance and DVA details.
 */

import { prisma } from '../config/db.js';

// Production-safe in-memory sliding window rate limiter with TTL eviction and memory guards
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute sliding window
const MAX_REQUESTS_PER_WINDOW = 30; // Max requests per window per IP
const MAX_TRACKED_IPS = 10000; // Hard capacity ceiling to prevent DoS memory exhaustion
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Sweep stale entries every 5 minutes

/**
 * Periodically purge stale IP entries to prevent memory accumulation over time
 */
const cleanupTimer = setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    // If all timestamps are older than the window, evict the entry completely
    if (!timestamps || timestamps.length === 0 || timestamps[timestamps.length - 1] <= cutoff) {
      rateLimitMap.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Allow Node.js process to terminate cleanly without being held open by this background timer
if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

/**
 * Safely extract normalized client IP from request headers or socket
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const rawIp = String(forwarded).split(',')[0].trim();
    return rawIp.replace(/^::ffff:/, '');
  }
  const remote = req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  return String(remote).replace(/^::ffff:/, '');
}

/**
 * Check if client IP is within allowed rate limits.
 * Evicts stale timestamps, deletes empty entries, and caps maximum map size.
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Capacity guard: if map exceeds capacity ceiling, purge oldest entries
  if (rateLimitMap.size >= MAX_TRACKED_IPS) {
    const firstKey = rateLimitMap.keys().next().value;
    if (firstKey) {
      rateLimitMap.delete(firstKey);
    }
  }

  const existing = rateLimitMap.get(ip);
  const timestamps = existing ? existing.filter((t) => t > windowStart) : [];

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

/**
 * Get basic public school details by slug
 * GET /api/public/schools/:slug
 */
export const getPublicSchoolDetails = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'School slug is required.' });
    }

    const school = await prisma.school.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        id: true,
        slug: true,
        name: true,
        phone: true,
        email: true,
        logoUrl: true,
        academicSession: true,
        currentTerm: true,
        createdAt: true
      }
    });

    if (!school) {
      return res.status(404).json({
        error: 'School not found with the specified URL slug.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...school,
        activeTerm: school.currentTerm || 'First Term',
        activeSession: school.academicSession || '2026/2027',
        logoUrl: school.logoUrl || null
      }
    });
  } catch (error) {
    console.error('Error fetching public school details:', error);
    return res.status(500).json({
      error: 'Failed to retrieve school details',
      details: error.message
    });
  }
};

/**
 * Look up student fee status by admission number or parent phone
 * POST /api/public/lookup-student
 * Body: { schoolSlug, searchIdentifier }
 */
export const lookupStudent = async (req, res) => {
  try {
    const clientIp = getClientIp(req);

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Too many search requests. Please wait a moment and try again.'
      });
    }

    const schoolSlug = req.body?.schoolSlug || req.query?.schoolSlug;
    const searchIdentifier = req.body?.searchIdentifier || req.query?.identifier || req.query?.searchIdentifier;

    if (!schoolSlug || !searchIdentifier) {
      return res.status(400).json({
        error: 'Both schoolSlug and searchIdentifier (phone or admission number) are required.'
      });
    }

    // 1. Find school by unique slug
    const school = await prisma.school.findUnique({
      where: { slug: schoolSlug.toLowerCase() },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        email: true
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // 2. Normalize and sanitize the searchIdentifier
    const rawSearch = String(searchIdentifier).trim();
    const cleanDigits = rawSearch.replace(/\D/g, '');

    // Phone variations (e.g. 08031234567 vs 2348031234567)
    let localPhone = cleanDigits;
    let intlPhone = cleanDigits;

    if (cleanDigits.startsWith('234') && cleanDigits.length === 13) {
      localPhone = '0' + cleanDigits.slice(3);
    } else if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
      intlPhone = '234' + cleanDigits.slice(1);
    }

    // 3. Search students in this school
    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { admissionNumber: { equals: rawSearch, mode: 'insensitive' } },
          { parentPhone: rawSearch },
          { parentPhone: cleanDigits },
          ...(localPhone ? [{ parentPhone: localPhone }] : []),
          ...(intlPhone ? [{ parentPhone: intlPhone }] : [])
        ]
      },
      include: {
        virtualAccount: true,
        invoices: {
          include: {
            items: true,
            payments: {
              orderBy: { paidAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (students.length === 0) {
      return res.status(404).json({
        error: 'No enrolled student found matching this admission number or parent phone number.'
      });
    }

    // 4. Sanitize response payload to strictly protect student & staff privacy
    const sanitizedStudents = students.map((st) => {
      // Obfuscate surname to initial only: "Chinedu Okafor" -> "Chinedu O."
      const lastInitial = st.lastName ? `${st.lastName.trim().charAt(0).toUpperCase()}.` : '';
      const maskedName = `${st.firstName} ${lastInitial}`.trim();

      // Find active invoice
      const activeInvoice = st.invoices[0] || null;

      const sanitizedInvoice = activeInvoice
        ? {
            id: activeInvoice.id,
            term: activeInvoice.term,
            academicSession: activeInvoice.academicSession,
            totalAmountKobo: activeInvoice.totalAmountKobo,
            amountPaidKobo: activeInvoice.amountPaidKobo,
            balanceRemainingKobo: Math.max(0, activeInvoice.totalAmountKobo - activeInvoice.amountPaidKobo),
            status: activeInvoice.status,
            dueDate: activeInvoice.dueDate,
            items: (activeInvoice.items || []).map((it) => ({
              id: it.id,
              description: it.description,
              amountKobo: it.amountKobo
            }))
          }
        : null;

      // Extract cleared installments
      const recentPayments = (activeInvoice?.payments || []).map((p) => ({
        id: p.id,
        amountKobo: p.amountKobo,
        paidAt: p.paidAt,
        transactionReference: p.transactionReference,
        paymentMethod: p.paymentMethod
      }));

      // Sanitize DVA
      const virtualAccount = st.virtualAccount
        ? {
            bankName: st.virtualAccount.bankName,
            accountNumber: st.virtualAccount.accountNumber,
            accountName: st.virtualAccount.accountName
          }
        : null;

      return {
        id: st.id,
        firstName: st.firstName,
        maskedLastName: lastInitial,
        displayName: maskedName,
        classGrade: st.classGrade,
        admissionNumber: st.admissionNumber || `ADM-${st.id.slice(0, 6).toUpperCase()}`,
        virtualAccount,
        activeInvoice: sanitizedInvoice,
        recentPayments
      };
    });

    return res.status(200).json({
      success: true,
      school: {
        name: school.name,
        slug: school.slug,
        phone: school.phone,
        email: school.email
      },
      count: sanitizedStudents.length,
      primaryStudent: sanitizedStudents[0],
      students: sanitizedStudents
    });
  } catch (error) {
    console.error('Error looking up student on parent portal:', error);
    return res.status(500).json({
      error: 'Unable to complete student lookup',
      details: error.message
    });
  }
};

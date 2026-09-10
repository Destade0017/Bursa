/**
 * Currency & Text Formatters Utility for BURSA
 * Provides standardized Nigerian Naira formatting, phone cleaning, and WhatsApp template generation.
 */

/**
 * Format numerical amount to Nigerian Naira (₦)
 * @param {number} amount - The amount in Naira or Kobo
 * @param {boolean} isKobo - Set to true if the input amount is in Kobo (default: false)
 * @returns {string} Formatted string e.g. "₦150,000" or "₦150,000.00"
 */
export function formatNaira(amount, isKobo = false) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₦0';
  }
  const nairaValue = isKobo ? Number(amount) / 100 : Number(amount);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(nairaValue);
}

/**
 * Clean Nigerian phone number to international format (234...)
 * @param {string} phone - Raw phone number (e.g., "08066360787", "+2348066360787", "806 636 0787")
 * @returns {string} Cleaned number starting with 234
 */
export function cleanNigerianPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  } else if (cleaned.length === 10) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
}

/**
 * Generate a 1-on-1 WhatsApp Arrears Reminder Link
 * Enforces zero group chats & live balance verification
 */
export function generateWhatsAppReminderUrl({
  parentPhone,
  parentName,
  studentName,
  classGrade,
  remainingBalanceNaira,
  accountNumber,
  bankName = 'Wema Bank',
  schoolName = 'School'
}) {
  const cleanPhone = cleanNigerianPhone(parentPhone);
  const formattedBalance = formatNaira(remainingBalanceNaira);

  const message =
    `*OFFICIAL SCHOOL FEE REMINDER - ${schoolName.toUpperCase()}*\n\n` +
    `Dear ${parentName},\n` +
    `This is a formal reminder regarding the outstanding First Term fee balance for *${studentName}* (${classGrade}).\n\n` +
    `*Outstanding Balance:* ${formattedBalance}\n\n` +
    `You may settle this fee via direct bank transfer to the student's Dedicated Virtual Account details below:\n` +
    `*Bank:* ${bankName}\n` +
    `*Account Number:* ${accountNumber}\n` +
    `*Account Name:* ${schoolName} / ${studentName}\n\n` +
    `Thank you for your prompt attention to this financial requirement.\n\n` +
    `*Bursar's Office*\n${schoolName}`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Known honorifics and professional titles (Nigerian & international school contexts)
 * Handles compound titles such as "Chief (Mrs.)", "Chief (Dr.)", "Rev. Dr.", etc.
 */
const TITLE_REGEX = /^(Chief\s*\((?:Mrs|Dr)\.?\)|(?:Chief|Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Engr|Barr|Alhaji|Alhaja|Hajia|Pastor|Rev|Reverend|Deacon|Deaconess|Elder|Sir|Madam|Lady)\.?)(?:\s+|$)/i;

/**
 * Extract first name, title, and display name from user profile object or name string
 * @param {Object|string} user - User object (with firstName, fullName, role, etc.) or raw name string
 * @returns {{ firstName: string, displayName: string, title: string }}
 */
export function extractUserNames(user) {
  if (!user) {
    return { firstName: '', displayName: 'Administrator', title: '' };
  }

  // If passed a plain string name
  if (typeof user === 'string') {
    user = { fullName: user };
  }

  const rawFullName = (user.fullName || user.name || '').trim().replace(/\s+/g, ' ');
  let title = user.title && typeof user.title === 'string' ? user.title.trim() : '';

  // Extract title if present in fullName and not explicitly provided
  const match = rawFullName.match(TITLE_REGEX);
  let remainder = rawFullName;
  if (match) {
    if (!title) {
      title = match[1].trim();
    }
    remainder = rawFullName.slice(match[0].length).trim();
  }

  // Determine firstName: prefer user.firstName if present, otherwise extract first word from remainder
  let firstName = '';
  if (user.firstName && typeof user.firstName === 'string' && user.firstName.trim()) {
    firstName = user.firstName.trim();
  } else {
    const parts = remainder.split(' ').filter(Boolean);
    firstName = parts.length > 0 ? parts[0] : '';
  }

  let displayName = '';
  if (title && firstName) {
    displayName = `${title} ${firstName}`;
  } else if (firstName) {
    displayName = firstName;
  } else {
    // If only title was provided with no actual name (e.g., "Mr." or "Chief")
    displayName =
      user.role === 'PROPRIETOR'
        ? 'Proprietor'
        : user.role === 'BURSAR'
        ? 'Head Bursar'
        : 'Administrator';
  }

  return { firstName, displayName, title };
}

/**
 * Get personalized greeting name for dashboard header
 * - Prioritizes actual first name
 * - Preserves existing title if present (e.g. "Mr. John" or "Chief (Mrs.) Folashade")
 * - Falls back gracefully to role or "Administrator" if no first name is available
 * 
 * @param {Object|string} user - User object or full name string
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeTitle - Whether to include title if present (default: true)
 * @returns {string} E.g., "John", "Mr. John", "Chief (Mrs.) Folashade", or "Administrator"
 */
export function getUserGreetingName(user, { includeTitle = true } = {}) {
  const { firstName, displayName } = extractUserNames(user);
  if (!includeTitle && firstName) {
    return firstName;
  }
  return displayName || firstName || 'Administrator';
}

/**
 * Extract clean initials for avatar badges, skipping honorific prefixes like "Mr." or "Dr."
 * E.g., "Mr. Emmanuel Okon" -> "EO", "Chief (Mrs.) Folashade" -> "FT" or "FO"
 */
export function getUserInitials(user) {
  if (!user) return 'AD';
  const rawFullName = (typeof user === 'string' ? user : user.fullName || user.name || '').trim();
  if (!rawFullName) return 'AD';

  const match = rawFullName.match(TITLE_REGEX);
  const remainder = match ? rawFullName.slice(match[0].length).trim() : rawFullName;
  const parts = remainder.split(' ').filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return 'AD';
}


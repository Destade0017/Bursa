/**
 * WhatsApp Receipt Link & Message Generator Utility
 * Cleans Nigerian phone numbers to international format and constructs pre-filled WhatsApp wa.me links.
 */

/**
 * Normalizes a Nigerian phone number to international format (234...)
 * @param {string} phone 
 * @returns {string} Cleaned phone number string
 */
export const cleanNigerianPhone = (phone) => {
  if (!phone) return '';
  // Remove spaces, dashes, plus signs, and special characters
  let cleaned = phone.replace(/\D/g, '');

  // Convert 080... or 090... or 070... to 23480...
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = `234${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('8') || cleaned.startsWith('9') || cleaned.startsWith('7')) {
    if (cleaned.length === 10) {
      cleaned = `234${cleaned}`;
    }
  }
  return cleaned;
};

/**
 * Generates a pre-filled WhatsApp URL for payment receipts
 */
export const generateWhatsAppReceiptUrl = ({
  schoolName = 'Crown Heights International Academy',
  parentPhone,
  parentName,
  studentName,
  classGrade,
  amountPaidNaira,
  totalBilledNaira,
  remainingBalanceNaira,
  transactionRef = 'N/A',
  status = 'PAID'
}) => {
  const cleanPhone = cleanNigerianPhone(parentPhone);

  const formattedAmountPaid = Number(amountPaidNaira || 0).toLocaleString();
  const formattedTotalBilled = Number(totalBilledNaira || 0).toLocaleString();
  const formattedBalance = Number(remainingBalanceNaira || 0).toLocaleString();

  const message = `*OFFICIAL PAYMENT RECEIPT - ${schoolName.toUpperCase()}*

Dear *${parentName || 'Parent'}*,

We have confirmed receipt of your payment for *${studentName}* (${classGrade}).

• *Amount Paid:* ₦${formattedAmountPaid}
• *Total Billed:* ₦${formattedTotalBilled}
• *Remaining Balance:* ₦${formattedBalance}
• *Status:* ${status.replace('_', ' ')}
• *Reference ID:* ${transactionRef}
• *Issued On:* ${new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}

Thank you for your prompt partnership and support!

_Bursar Pay Engine - ${schoolName}_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

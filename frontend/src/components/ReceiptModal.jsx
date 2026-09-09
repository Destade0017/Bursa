import React from 'react';
import {
  FileText,
  Printer,
  X,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MessageCircle,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { generateWhatsAppReminderUrl } from '../utils/formatters.js';

export default function ReceiptModal({
  student,
  invoice: propInvoice,
  school,
  onClose
}) {
  if (!student) return null;

  // Derive Invoice
  const invoice = propInvoice || student.latestInvoice;
  if (!invoice) return null;

  const totalBilledNaira = (invoice.totalAmountKobo || 0) / 100;
  const amountPaidNaira = (invoice.amountPaidKobo || 0) / 100;
  const remainingBalanceNaira = Math.max(0, totalBilledNaira - amountPaidNaira);
  const isPaid = invoice.status === 'PAID';

  const schoolName = school?.name || 'Crown Heights College';
  const dva = student.virtualAccount;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share URL
  const whatsappUrl = generateWhatsAppReminderUrl({
    parentPhone: student.parentPhone,
    parentName: student.parentName,
    studentName: `${student.firstName} ${student.lastName}`,
    classGrade: student.classGrade,
    remainingBalanceNaira,
    accountNumber: dva?.accountNumber || 'N/A',
    bankName: dva?.bankName || 'Wema Bank',
    schoolName
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white animate-fadeIn">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: #ffffff !important;
            color: #0f172a !important;
            border: 1.5px solid #cbd5e1 !important;
            border-radius: 16px !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Wrapper */}
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] overflow-y-auto relative print:border-none print:shadow-none print:m-0 print:max-w-none text-slate-900">
        {/* Action Header Bar (Hidden on Print) */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FileText className="w-4 h-4 text-[#10B981]" />
            Official Payment Receipt & Clearance Slip
          </div>

          <div className="flex items-center gap-2">
            {/* Send via WhatsApp Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition active:scale-98"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Send via WhatsApp
            </a>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-semibold text-xs border border-slate-200 shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              Print / Save PDF
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Slip Body */}
        <div id="printable-receipt" className="p-8 text-slate-900 bg-white">
          {/* School Header */}
          <div className="border-b border-slate-200 pb-6 mb-6 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#10B981] shadow-xs">
                <Building2 className="w-8 h-8 text-[#10B981]" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {schoolName}
                </h1>
                <p className="text-xs text-slate-500 font-medium">Bursar Financial Services & Student Accounting</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ref: {invoice.id.toUpperCase()} • Issued: {new Date(invoice.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 block font-bold">
                Term Session
              </span>
              <span className="text-sm font-bold text-blue-600">
                {invoice.term} ({invoice.academicSession})
              </span>
            </div>
          </div>

          {/* Student & DVA Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold block mb-1">
                Student Details
              </span>
              <div className="font-bold text-sm text-slate-900">
                {student.firstName} {student.lastName}
              </div>
              <div className="text-blue-600 font-semibold mt-0.5">
                Class: {student.classGrade}
              </div>
              <div className="text-slate-500 mt-1">
                Parent: {student.parentName} ({student.parentPhone})
              </div>
            </div>

            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold block mb-1">
                Dedicated Virtual Account (DVA)
              </span>
              <div className="font-bold text-sm text-slate-900">
                {dva ? dva.bankName : 'Wema Bank'}
              </div>
              <div className="font-mono text-sm font-extrabold text-blue-600">
                {dva ? dva.accountNumber : 'N/A'}
              </div>
              <div className="text-slate-500 text-[11px] mt-1">
                Account Name: {dva ? dva.accountName : `${schoolName} / ${student.firstName} ${student.lastName}`}
              </div>
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Itemized Fee Breakdown
            </h3>
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Item Description</th>
                  <th className="px-4 py-2.5 text-right">Amount (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-800 font-medium">{item.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900 font-semibold">
                        ₦{((item.amountKobo || 0) / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-2.5 text-slate-800 font-medium">Standard School & Tuition Fees</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-900 font-semibold">
                      ₦{totalBilledNaira.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-6 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Total Term Bill:</span>
              <span className="font-mono font-bold text-slate-900">
                ₦{totalBilledNaira.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span className="font-semibold">Total Amount Cleared:</span>
              <span className="font-mono font-extrabold">
                ₦{amountPaidNaira.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-700">Outstanding Balance:</span>
              <span className={`font-mono font-extrabold ${remainingBalanceNaira === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ₦{remainingBalanceNaira.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Digital Exam Clearance Pass (Prominent Green Banner + QR Code) */}
          {isPaid ? (
            <div className="bg-[#ECFDF5] border-2 border-emerald-300 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#10B981] text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#10B981] text-white uppercase tracking-wider mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> EXAM CLEARANCE APPROVED
                  </span>
                  <p className="text-xs text-emerald-800 font-semibold">
                    This student is fully cleared to sit for {invoice.term} examinations.
                  </p>
                </div>
              </div>

              {/* Generated Verification QR Code */}
              <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center">
                <QRCodeSVG value={`BURSA:VERIFIED:${invoice.id}`} size={84} level="H" />
                <span className="text-[8px] font-mono text-slate-600 font-bold mt-1">VERIFIED PASS</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#FEF3C7] border border-amber-300 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 block">
                    CLEARANCE PENDING (PARTIAL / UNPAID)
                  </span>
                  <span className="text-amber-800">
                    Exam clearance card will generate automatically once the remaining ₦{remainingBalanceNaira.toLocaleString()} is cleared.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Signature Notice */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-medium">
            This is a computer-generated digital receipt and official examination permit issued by {schoolName}.
          </div>
        </div>
      </div>
    </div>
  );
}

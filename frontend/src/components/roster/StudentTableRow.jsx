import React from 'react';
import {
  Heart,
  Copy,
  Check,
  FileText,
  MessageCircle,
  Send,
  Link2,
  CheckCheck
} from 'lucide-react';
import { formatNaira, generateWhatsAppReminderUrl } from '../../utils/formatters.js';

export default function StudentTableRow({
  student,
  school,
  dva,
  paidPercent,
  getStatusBadge,
  handleCopyAccount,
  copiedAccount,
  onSelectStudentForLedger,
  onOpenReceipt,
  onSimulatePayment,
  onCopyParentLink,
  copiedLinkStudentId
}) {
  const whatsappUrl = generateWhatsAppReminderUrl({
    parentPhone: student.parentPhone,
    parentName: student.parentName,
    studentName: `${student.firstName} ${student.lastName}`,
    classGrade: student.classGrade,
    remainingBalanceNaira: Math.max(0, student.totalBilledKobo - student.amountPaidKobo) / 100,
    accountNumber: dva?.accountNumber || 'N/A',
    bankName: dva?.bankName || 'Wema Bank',
    schoolName: school?.name || 'Crown Heights College'
  });

  const isLinkCopied = copiedLinkStudentId === student.id;

  return (
    <tr
      className="hover:bg-slate-800/40 transition group cursor-pointer"
      onClick={() => onSelectStudentForLedger(student)}
    >
      {/* Student & Class */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
            {student.firstName[0]}
            {student.lastName[0]}
          </div>
          <div>
            <div className="font-bold text-sm text-white group-hover:text-emerald-400 transition">
              {student.firstName} {student.lastName}
            </div>
            <div className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
              <span>{student.classGrade}</span>
              {student.admissionNumber && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 font-mono text-[11px]">{student.admissionNumber}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Parent & Sibling */}
      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="font-medium text-slate-200">{student.parentName}</div>
        <div className="text-slate-400 font-mono text-xs">{student.parentPhone}</div>
        {student.siblings && student.siblings.length > 0 && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-semibold">
            <Heart className="w-3 h-3 text-purple-400 fill-purple-400" />
            Sibling of {student.siblings.map((s) => s.firstName).join(', ')}
          </span>
        )}
      </td>

      {/* Dedicated Virtual Account */}
      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
        {dva ? (
          <div className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl px-3 py-1.5 transition">
            <div>
              <span className="text-[9px] uppercase font-black text-emerald-400 block tracking-widest">
                {dva.bankName}
              </span>
              <span className="font-mono text-xs font-bold text-white tracking-wider">
                {dva.accountNumber}
              </span>
            </div>
            <button
              onClick={() => handleCopyAccount(dva.accountNumber)}
              className="p-1 text-slate-400 hover:text-white transition"
              title="Copy DVA Number"
            >
              {copiedAccount === dva.accountNumber ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-slate-500 italic">No DVA Assigned</span>
        )}
      </td>

      {/* Billed vs Paid Progress Bar */}
      <td className="px-6 py-4">
        <div className="font-semibold text-slate-200">
          {formatNaira(student.amountPaidKobo, true)}{' '}
          <span className="text-slate-500 font-normal">
            / {formatNaira(student.totalBilledKobo, true)}
          </span>
        </div>
        <div className="w-36 h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              student.status === 'PAID'
                ? 'bg-emerald-500'
                : student.status === 'PART_PAID'
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${paidPercent}%` }}
          />
        </div>
      </td>

      {/* Status Badge */}
      <td className="px-6 py-4">{getStatusBadge(student.status)}</td>

      {/* Action Buttons */}
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {/* Copy Direct Parent Portal Link */}
          <button
            onClick={() => onCopyParentLink(student)}
            className={`p-2 rounded-xl border transition ${
              isLinkCopied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Copy Parent Portal Link (WhatsApp)"
          >
            {isLinkCopied ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </button>

          {/* Receipt */}
          {student.latestInvoice && (
            <button
              onClick={() => onOpenReceipt(student)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
              title="View Official Receipt & Exam Pass"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}

          {/* WhatsApp Reminder */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 transition"
            title="Send WhatsApp Reminder"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </a>

          {/* Simulate Bank Transfer */}
          <button
            onClick={() => onSimulatePayment(student)}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/20 transition active:scale-95"
            title="Simulate DVA Bank Transfer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

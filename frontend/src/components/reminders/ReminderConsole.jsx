import React, { useState } from 'react';
import {
  MessageCircle,
  ShieldCheck,
  Lock,
  Search,
  Send,
  AlertCircle,
  Clock,
  Phone,
  CheckCircle2,
  Users
} from 'lucide-react';
import { formatNaira, generateWhatsAppReminderUrl } from '../../utils/formatters.js';

export default function ReminderConsole({ students, invoices, school }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Map defaulters (UNPAID or PART_PAID)
  const defaulterList = students
    .map((s) => {
      const studentInvoices = invoices.filter((inv) => inv.studentId === s.id);
      const latestInvoice = studentInvoices[0] || null;
      const totalBilledKobo = latestInvoice ? latestInvoice.totalAmountKobo : 0;
      const amountPaidKobo = latestInvoice ? latestInvoice.amountPaidKobo : 0;
      const remainingBalanceKobo = Math.max(0, totalBilledKobo - amountPaidKobo);

      return {
        ...s,
        latestInvoice,
        totalBilledKobo,
        amountPaidKobo,
        remainingBalanceKobo,
        status: latestInvoice ? latestInvoice.status : 'NO_INVOICE'
      };
    })
    .filter((s) => s.status === 'UNPAID' || s.status === 'PART_PAID');

  const filteredDefaulters = defaulterList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.parentName.toLowerCase().includes(q) ||
      s.parentPhone.includes(q) ||
      s.classGrade.toLowerCase().includes(q)
    );
  });

  const totalOutstandingArrearsKobo = defaulterList.reduce(
    (sum, s) => sum + s.remainingBalanceKobo,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#10B981] border border-emerald-200">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">WhatsApp Fee Reminders Console</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Streamline 1-on-1 parent communications with pre-verified live balance checks and automated Dedicated Virtual Account links.
          </p>
        </div>

        {/* Security Guardrails Box */}
        <div className="flex items-center gap-3 bg-[#EFF6FF] p-3.5 rounded-xl border border-blue-200 text-xs">
          <ShieldCheck className="w-7 h-7 text-blue-600 shrink-0" />
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" /> 1-on-1 Privacy Protection
            </div>
            <div className="text-[11px] text-slate-600">
              Zero Group Chats • Real-Time Balance Verification
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Metric Summary Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Outstanding Arrears
            </span>
            <div className="text-3xl font-black text-rose-600 tracking-tight mt-1">
              {formatNaira(totalOutstandingArrearsKobo, true)}
            </div>
          </div>

          <div className="text-xs text-slate-500 mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>{defaulterList.length} Accounts Pending</span>
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Action Required
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search parent name, student name, class, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Defaulters Roster Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Student & Class</th>
                <th className="px-6 py-3.5">Parent & Contact</th>
                <th className="px-6 py-3.5">Dedicated Virtual Account</th>
                <th className="px-6 py-3.5">Outstanding Arrears (₦)</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDefaulters.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-10 h-10 text-[#10B981] mx-auto mb-2 opacity-80" />
                    All student fee balances cleared! Zero defaulters pending.
                  </td>
                </tr>
              ) : (
                filteredDefaulters.map((student) => {
                  const dva = student.virtualAccount;

                  const whatsappUrl = generateWhatsAppReminderUrl({
                    parentPhone: student.parentPhone,
                    parentName: student.parentName,
                    studentName: `${student.firstName} ${student.lastName}`,
                    classGrade: student.classGrade,
                    remainingBalanceNaira: student.remainingBalanceKobo / 100,
                    accountNumber: dva?.accountNumber || 'N/A',
                    bankName: dva?.bankName || 'Wema Bank',
                    schoolName: school?.name || 'School'
                  });

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition">
                      {/* Student & Class */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-slate-900">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-xs text-blue-600 font-semibold">{student.classGrade}</div>
                      </td>

                      {/* Parent & Phone */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{student.parentName}</div>
                        <div className="text-slate-500 font-mono text-xs">{student.parentPhone}</div>
                      </td>

                      {/* DVA Account */}
                      <td className="px-6 py-4">
                        {dva ? (
                          <div className="font-mono text-xs font-bold text-slate-800">
                            {dva.bankName}: <span className="text-emerald-700">{dva.accountNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No DVA Assigned</span>
                        )}
                      </td>

                      {/* Arrears Amount */}
                      <td className="px-6 py-4 font-black text-rose-600 text-sm font-mono">
                        {formatNaira(student.remainingBalanceKobo, true)}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Open 1-on-1 WhatsApp
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

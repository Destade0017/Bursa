import React, { useState } from 'react';
import {
  Search,
  Users,
  Copy,
  Check,
  Heart,
  FileText,
  MessageCircle,
  Send,
  PlusCircle,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { formatNaira, generateWhatsAppReminderUrl } from '../../utils/formatters.js';
import StudentTableRow from './StudentTableRow.jsx';

export default function RosterView({
  students,
  invoices,
  school,
  onSelectStudentForLedger,
  onSimulatePayment,
  onOpenReceipt,
  onOpenCashModal,
  onOpenCsvModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedAccount, setCopiedAccount] = useState(null);
  const [copiedLinkStudentId, setCopiedLinkStudentId] = useState(null);

  const handleCopyParentLink = (student) => {
    const slug = school?.slug || '';
    const identifier = student.admissionNumber || student.parentPhone;
    const portalUrl = `${window.location.origin}/portal/${slug}?ref=${encodeURIComponent(identifier)}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLinkStudentId(student.id);
    setTimeout(() => setCopiedLinkStudentId(null), 3000);
  };

  // Identify sibling groups by parent phone
  const parentGroupMap = {};
  students.forEach((s) => {
    const key = s.parentPhone;
    if (!parentGroupMap[key]) parentGroupMap[key] = [];
    parentGroupMap[key].push(s);
  });

  // Map students to their invoices & sibling records
  const studentRoster = students.map((s) => {
    const studentInvoices = invoices.filter((inv) => inv.studentId === s.id);
    const latestInvoice = studentInvoices[0] || null;
    const siblings = (parentGroupMap[s.parentPhone] || []).filter((item) => item.id !== s.id);

    return {
      ...s,
      latestInvoice,
      totalBilledKobo: latestInvoice ? latestInvoice.totalAmountKobo : 0,
      amountPaidKobo: latestInvoice ? latestInvoice.amountPaidKobo : 0,
      status: latestInvoice ? latestInvoice.status : 'NO_INVOICE',
      siblings
    };
  });

  // Extract unique class grades
  const availableClasses = Array.from(new Set(students.map((s) => s.classGrade).filter(Boolean))).sort();

  // Filter roster
  const filteredRoster = studentRoster.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.classGrade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.virtualAccount && student.virtualAccount.accountNumber.includes(searchQuery));

    const matchesClass = classFilter === 'ALL' || student.classGrade === classFilter;
    const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleCopyAccount = (accountNum) => {
    navigator.clipboard.writeText(accountNum);
    setCopiedAccount(accountNum);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> PAID
          </span>
        );
      case 'PART_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> PART PAID
          </span>
        );
      case 'UNPAID':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5" /> UNPAID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            NO INVOICE
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name, parent phone, or DVA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Dropdown */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500 transition"
          >
            <option value="ALL">All Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {/* Status Filter Pills */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {['ALL', 'UNPAID', 'PART_PAID', 'PAID'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Log Cash Action */}
          <button
            onClick={onOpenCashModal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Record Cash
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Student & Class</th>
                <th className="px-6 py-4">Parent & Sibling Group</th>
                <th className="px-6 py-4">Dedicated Virtual Account</th>
                <th className="px-6 py-4">Billed vs. Cleared</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No student records match your filters.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((student) => {
                  const dva = student.virtualAccount;
                  const paidPercent =
                    student.totalBilledKobo > 0
                      ? Math.min(100, Math.round((student.amountPaidKobo / student.totalBilledKobo) * 100))
                      : 0;

                  return (
                    <StudentTableRow
                      key={student.id}
                      student={student}
                      school={school}
                      dva={dva}
                      paidPercent={paidPercent}
                      getStatusBadge={getStatusBadge}
                      handleCopyAccount={handleCopyAccount}
                      copiedAccount={copiedAccount}
                      onSelectStudentForLedger={onSelectStudentForLedger}
                      onOpenReceipt={onOpenReceipt}
                      onSimulatePayment={onSimulatePayment}
                      onCopyParentLink={handleCopyParentLink}
                      copiedLinkStudentId={copiedLinkStudentId}
                    />
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

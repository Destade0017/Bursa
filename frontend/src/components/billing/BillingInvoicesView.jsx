import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Sparkles,
  Download,
  CalendarCheck,
  FileSpreadsheet
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';

export default function BillingInvoicesView({
  invoices = [],
  students = [],
  school,
  onNavigateTab,
  onOpenReceipt,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  // Compute Summary Metrics
  const totalBilledKobo = invoices.reduce((sum, inv) => sum + (inv.totalAmountKobo || 0), 0);
  const totalCollectedKobo = invoices.reduce((sum, inv) => sum + (inv.amountPaidKobo || 0), 0);
  const totalOutstandingKobo = Math.max(0, totalBilledKobo - totalCollectedKobo);
  const collectionRate = totalBilledKobo > 0 ? Math.round((totalCollectedKobo / totalBilledKobo) * 100) : 0;

  // Extract unique classes
  const uniqueClasses = Array.from(
    new Set(
      students.map((s) => s.classGrade).filter(Boolean)
    )
  ).sort();

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const student = inv.student || students.find((s) => s.id === inv.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
    const studentClass = student?.classGrade || '';
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      studentName.includes(q) ||
      inv.term?.toLowerCase().includes(q) ||
      inv.academicSession?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesClass = classFilter === 'ALL' || studentClass === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;
    let csv = 'Student Name,Class,Term,Academic Session,Total Billed (NGN),Amount Paid (NGN),Balance (NGN),Status,Due Date\n';
    filteredInvoices.forEach((inv) => {
      const st = inv.student || students.find((s) => s.id === inv.studentId);
      const name = st ? `${st.firstName} ${st.lastName}` : 'Unknown';
      const cls = st?.classGrade || 'N/A';
      const billed = (inv.totalAmountKobo || 0) / 100;
      const paid = (inv.amountPaidKobo || 0) / 100;
      const balance = billed - paid;
      const dueDate = inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : 'N/A';
      csv += `"${name}","${cls}","${inv.term}","${inv.academicSession}",${billed},${paid},${balance},"${inv.status}","${dueDate}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoices_Billing_${school?.slug || 'school'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#3B82F6] border border-blue-100">
              <Receipt className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Invoices & Billing Ledger</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#3B82F6] font-bold border border-blue-200">
              {invoices.length} Total Invoices
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Complete institutional billing registry. Manage term fee invoices, track clearance status, and review line-item breakdowns across all student cohorts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab && onNavigateTab('fee-schedules')}
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>1-Click Mass Invoicing</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredInvoices.length === 0}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Total Invoiced Volume
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatNaira(totalBilledKobo, true)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{invoices.length} active invoices generated</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Collected Revenue
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            {formatNaira(totalCollectedKobo, true)}
          </div>
          <p className="text-xs text-emerald-700 mt-1.5 font-medium">{collectionRate}% of billed revenue collected</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Outstanding Arrears
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
            {formatNaira(totalOutstandingKobo, true)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{100 - collectionRate}% pending fee collection</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Active Term & Session
            </span>
            <div className="text-base font-bold text-slate-900">First Term 2026/2027</div>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('fee-schedules')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 mt-2 transition"
          >
            Configure Fee Templates
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or session..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {['ALL', 'UNPAID', 'PART_PAID', 'PAID'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'PART_PAID' ? 'Part Paid' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Class Filter */}
          {uniqueClasses.length > 0 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-white border border-slate-200 text-xs text-slate-700 font-medium rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-[#10B981]"
            >
              <option value="ALL">All Cohorts</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">No Invoices Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {invoices.length === 0
              ? 'No invoices generated yet for this term. Go to Fee Schedules to run 1-Click Mass Invoicing.'
              : 'No invoices match the selected search or status filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
                  <th className="p-4">Student & Cohort</th>
                  <th className="p-4">Term & Session</th>
                  <th className="p-4 text-right">Billed Amount</th>
                  <th className="p-4 text-right">Amount Paid</th>
                  <th className="p-4 text-right">Outstanding</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const student = inv.student || students.find((s) => s.id === inv.studentId);
                  const billed = inv.totalAmountKobo || 0;
                  const paid = inv.amountPaidKobo || 0;
                  const balance = Math.max(0, billed - paid);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {student?.classGrade || 'N/A'} • Parent: {student?.parentName || 'N/A'}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{inv.term}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {inv.academicSession}
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-slate-900">
                        {formatNaira(billed, true)}
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-emerald-600">
                        {formatNaira(paid, true)}
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-amber-600">
                        {formatNaira(balance, true)}
                      </td>

                      <td className="p-4 text-center">
                        {inv.status === 'PAID' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-emerald-700 border border-emerald-200">
                            Cleared / Paid
                          </span>
                        )}
                        {inv.status === 'PART_PAID' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-amber-700 border border-amber-200">
                            Part Paid
                          </span>
                        )}
                        {inv.status === 'UNPAID' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEE2E2] text-rose-700 border border-rose-200">
                            Unpaid
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {student && onOpenReceipt && (
                          <button
                            onClick={() => onOpenReceipt(student)}
                            className="bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            Pass / Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

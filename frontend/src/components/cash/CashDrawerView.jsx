import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';
import BursarCashDrawer from './BursarCashDrawer.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CashDrawerView({
  school,
  currentUser,
  onOpenCashModal,
  onRefresh
}) {
  const [drawerData, setDrawerData] = useState({
    unremittedTotalKobo: 0,
    unremittedCount: 0,
    transactions: []
  });
  const [loading, setLoading] = useState(false);

  const fetchDrawer = useCallback(async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${school.id}/cash-drawer/current`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDrawerData({
          unremittedTotalKobo: data.unremittedTotalKobo || 0,
          unremittedCount: data.unremittedCount || 0,
          transactions: data.transactions || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch cash drawer:', err);
    } finally {
      setLoading(false);
    }
  }, [school?.id]);

  useEffect(() => {
    fetchDrawer();
    const handlePaymentRecorded = () => fetchDrawer();
    const handleHandoverConfirmed = () => fetchDrawer();
    const handleDrawerClosed = () => fetchDrawer();

    window.addEventListener('bursaros:cash-payment-recorded', handlePaymentRecorded);
    window.addEventListener('bursaros:cash-handover-confirmed', handleHandoverConfirmed);
    window.addEventListener('bursaros:cash-drawer-closed', handleDrawerClosed);

    return () => {
      window.removeEventListener('bursaros:cash-payment-recorded', handlePaymentRecorded);
      window.removeEventListener('bursaros:cash-handover-confirmed', handleHandoverConfirmed);
      window.removeEventListener('bursaros:cash-drawer-closed', handleDrawerClosed);
    };
  }, [fetchDrawer]);

  const hasCash = drawerData.unremittedCount > 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#D97706] border border-amber-200">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Cash Drawer & Shift Register</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-amber-800 font-bold border border-amber-200">
              {drawerData.unremittedCount} Unremitted Receipts
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Physical counter cash desk operations. Cash payments logged at the Bursar counter are held in escrow in this active shift register until an end-of-day closeout is initiated.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BursarCashDrawer
            schoolId={school?.id}
            onCloseoutSuccess={() => {
              fetchDrawer();
              if (onRefresh) onRefresh();
            }}
          />

          {onOpenCashModal && (
            <button
              onClick={onOpenCashModal}
              className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Cash Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Physical Cash In Safe
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
            {formatNaira(drawerData.unremittedTotalKobo, true)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Unremitted physical cash balance</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Logged Counter Receipts
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
            {drawerData.unremittedCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Transactions in current shift</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Dual-Control Protocol
            </span>
            <div className="text-xs text-slate-600">
              {hasCash
                ? 'Action: Initiate End-of-Day Closeout to submit custody to School Proprietor.'
                : 'All shift receipts have been successfully submitted or remitted.'}
            </div>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            Audit Protocol Enforced
          </div>
        </div>
      </div>

      {/* Unremitted Cash Transactions Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Current Shift Counter Receipts</h3>
            <p className="text-xs text-slate-500">Physical cash collected and awaiting formal shift handover.</p>
          </div>
          <button
            onClick={fetchDrawer}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            title="Refresh Drawer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10B981]' : ''}`} />
          </button>
        </div>

        {drawerData.transactions.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#10B981] mx-auto mb-3 opacity-80" />
            <h4 className="text-sm font-bold text-slate-900">Counter Drawer Cleared</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no unremitted cash receipts in the counter safe. All past cash has been remitted to the proprietor or bank.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                  <th className="p-4">Receipt Ref & Time</th>
                  <th className="p-4">Student & Class</th>
                  <th className="p-4">Term</th>
                  <th className="p-4 text-right">Cash Collected</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drawerData.transactions.map((tx) => {
                  const student = tx.invoice?.student;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 font-mono text-[11px]">
                          {tx.transactionReference}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(tx.paidAt).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {student ? `${student.firstName} ${student.lastName}` : 'Direct Student'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {student?.classGrade || 'N/A'} • Parent: {student?.parentName || 'N/A'}
                        </div>
                      </td>

                      <td className="p-4 font-medium text-slate-600">
                        {tx.invoice?.term || 'First Term'}
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatNaira(tx.amountKobo, true)}
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-amber-200">
                          Unremitted (In Drawer)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

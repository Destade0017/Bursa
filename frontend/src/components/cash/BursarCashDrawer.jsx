import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  FileText,
  UploadCloud,
  X,
  Send,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

export default function BursarCashDrawer({ schoolId, onCloseoutSuccess }) {
  const [drawerData, setDrawerData] = useState({
    unremittedTotalKobo: 0,
    unremittedCount: 0,
    transactions: []
  });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Closeout form inputs
  const [notes, setNotes] = useState('');
  const [depositSlipUrl, setDepositSlipUrl] = useState('');

  const fetchDrawer = useCallback(async () => {
    if (!schoolId) return;
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${schoolId}/cash-drawer/current`, {
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
    }
  }, [schoolId]);

  useEffect(() => {
    fetchDrawer();

    // Listen for payments or handovers recorded to auto-refresh drawer
    const handlePaymentRecorded = () => fetchDrawer();
    const handleHandoverConfirmed = () => fetchDrawer();

    window.addEventListener('bursaros:cash-payment-recorded', handlePaymentRecorded);
    window.addEventListener('bursaros:cash-handover-confirmed', handleHandoverConfirmed);

    return () => {
      window.removeEventListener('bursaros:cash-payment-recorded', handlePaymentRecorded);
      window.removeEventListener('bursaros:cash-handover-confirmed', handleHandoverConfirmed);
    };
  }, [fetchDrawer]);

  const handleCloseDrawer = async (e) => {
    e.preventDefault();
    if (!schoolId || drawerData.unremittedCount === 0) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${schoolId}/cash-drawer/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          notes: notes.trim() || undefined,
          depositSlipUrl: depositSlipUrl.trim() || undefined
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Cash closeout batch submitted to Proprietor successfully!'
        });
        setNotes('');
        setDepositSlipUrl('');
        window.dispatchEvent(new CustomEvent('bursaros:cash-drawer-closed'));
        fetchDrawer();

        if (onCloseoutSuccess) {
          onCloseoutSuccess(data.handover);
        }

        setTimeout(() => {
          setStatusMessage(null);
          setModalOpen(false);
        }, 1800);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to submit shift closeout.'
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Network error submitting cash closeout batch.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const hasCash = drawerData.unremittedCount > 0;

  return (
    <>
      {/* Top Navigation Cash Drawer Pill / Widget */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border shadow-2xs cursor-pointer ${
            hasCash
              ? 'bg-[#FEF3C7] text-[#D97706] border-amber-200 hover:bg-amber-100'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
          title="Open Cash Drawer Shift Closeout"
        >
          <div className="relative">
            <Wallet className={`w-4 h-4 ${hasCash ? 'text-amber-600' : 'text-slate-400'}`} />
            {hasCash && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium hidden sm:inline">Cash Drawer:</span>
            <span className={hasCash ? 'text-amber-800 font-black' : 'text-slate-800 font-bold'}>
              {formatNaira(drawerData.unremittedTotalKobo, true)}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                hasCash
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {drawerData.unremittedCount} {drawerData.unremittedCount === 1 ? 'rcpt' : 'rcpts'}
            </span>
          </div>

          {hasCash && (
            <span className="ml-1 text-[11px] bg-amber-600 text-white px-2 py-0.5 rounded-lg font-bold hover:bg-amber-700 transition hidden md:inline-flex items-center gap-1">
              Close Shift
              <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>

      {/* End-of-Day Shift Closeout Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl relative max-h-[90vh] flex flex-col text-slate-900">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5 flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center border border-amber-200 shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Daily Cash Drawer & Handover</h3>
                <p className="text-xs text-slate-500">
                  End-of-day custody handover & bank remittance batching
                </p>
              </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`p-3.5 mb-4 rounded-xl border flex items-center gap-2 text-xs font-semibold flex-shrink-0 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Shift Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="text-[11px] font-medium text-slate-500">Physical Cash in Drawer</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {formatNaira(drawerData.unremittedTotalKobo, true)}
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold mt-1">Pending Proprietor handover</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="text-[11px] font-medium text-slate-500">Physical Receipts</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {drawerData.unremittedCount}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Counter entries in current shift</div>
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Unremitted Receipts in Drawer
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {drawerData.transactions.length} item(s)
                  </span>
                </div>

                {drawerData.transactions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-900">
                      Drawer is currently clean & balanced
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No unremitted physical cash payments logged for this shift.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {drawerData.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#10B981] flex items-center justify-center flex-shrink-0 border border-emerald-200">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {tx.invoice?.student
                                ? `${tx.invoice.student.firstName} ${tx.invoice.student.lastName}`
                                : 'Student Cash Payment'}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span className="font-mono text-blue-600">
                                {tx.transactionReference}
                              </span>
                              <span>•</span>
                              <span>
                                {tx.paidAt
                                  ? new Date(tx.paidAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Today'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-black text-slate-900">
                            {formatNaira(tx.amountKobo, true)}
                          </div>
                          <div className="text-[10px] text-amber-700 font-semibold">Unremitted</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Closeout Inputs Form */}
              {hasCash && (
                <form onSubmit={handleCloseDrawer} className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <p className="leading-relaxed">
                      Submitting creates a <strong>PENDING_VERIFICATION</strong> custody handover batch.
                      The physical cash remains in your accountability ledger until the School
                      Proprietor inspects the funds and signs off.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bank Deposit Teller / Remittance Reference{' '}
                      <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={depositSlipUrl}
                      onChange={(e) => setDepositSlipUrl(e.target.value)}
                      placeholder="e.g., GTBank Deposit Slip #049281 or pouch seal #7712"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bursar Handover Notes{' '}
                      <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Shift closeout counted at 4:30 PM. Handed in cash pouch directly to Proprietor's office."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                    >
                      Keep Open
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !hasCash}
                      className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting Closeout...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Shift Closeout (₦{(drawerData.unremittedTotalKobo / 100).toLocaleString()})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

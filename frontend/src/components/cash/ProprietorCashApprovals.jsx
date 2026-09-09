import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  FileText,
  Clock,
  User,
  ArrowRight,
  ExternalLink,
  X,
  RefreshCw,
  Sparkles,
  Building2,
  DollarSign
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ProprietorCashApprovals({ schoolId, onConfirmed }) {
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [proprietorNotes, setProprietorNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchHandovers = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(
        `${API_BASE}/api/schools/${schoolId}/cash-drawer/handovers?status=PENDING_VERIFICATION`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        setPendingHandovers(data.handovers || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending cash handovers:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchHandovers();

    // Listen for closeout events to refresh pending list
    const handleDrawerClosed = () => fetchHandovers();
    window.addEventListener('bursaros:cash-drawer-closed', handleDrawerClosed);

    return () => {
      window.removeEventListener('bursaros:cash-drawer-closed', handleDrawerClosed);
    };
  }, [fetchHandovers]);

  const handleOpenReview = (handover) => {
    setSelectedHandover(handover);
    setProprietorNotes('');
    setStatusMessage(null);
    setReviewModalOpen(true);
  };

  const handleConfirmCustody = async (e) => {
    e.preventDefault();
    if (!selectedHandover || !schoolId) return;

    setConfirming(true);
    setStatusMessage(null);

    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(
        `${API_BASE}/api/schools/${schoolId}/cash-drawer/${selectedHandover.id}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            notes: proprietorNotes.trim() || undefined
          })
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Physical cash custody confirmed and locked into treasury!'
        });

        window.dispatchEvent(new CustomEvent('bursaros:cash-handover-confirmed'));

        setTimeout(() => {
          setReviewModalOpen(false);
          setSelectedHandover(null);
          setStatusMessage(null);
          fetchHandovers();
          if (onConfirmed) onConfirmed();
        }, 1500);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to confirm physical cash custody.'
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Network error occurred while confirming handover.'
      });
    } finally {
      setConfirming(false);
    }
  };

  const totalPendingKobo = pendingHandovers.reduce(
    (sum, h) => sum + (h.amountKobo || 0),
    0
  );

  if (pendingHandovers.length === 0) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#10B981] border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              Physical Cash Custody Reconciled
              <span className="text-[10px] bg-[#ECFDF5] text-[#059669] border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Zero Discrepancies
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              All Bursar counter cash shifts have been verified, signed off, and credited into the school treasury.
            </div>
          </div>
        </div>

        <button
          onClick={fetchHandovers}
          title="Refresh pending handovers"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10B981]' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Executive Alert Card on Dashboard */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-2xs relative overflow-hidden animate-fadeIn">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                  Action Required
                </span>
                <span className="text-xs text-amber-800 font-semibold">
                  {pendingHandovers.length} Shift Closeout Batch{pendingHandovers.length > 1 ? 'es' : ''} Awaiting Handover
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatNaira(totalPendingKobo, true)} Physical Cash Submitted by Bursar
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Dual-Control Custody: Inspect the physical cash or bank deposit teller collected by the Bursar counter before signing off into the audited school treasury.
              </p>
            </div>
          </div>

          {/* Quick List or Review Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {pendingHandovers.map((handover) => (
              <button
                key={handover.id}
                onClick={() => handleOpenReview(handover)}
                className="flex items-center justify-between sm:justify-center gap-3 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>Review & Confirm {formatNaira(handover.amountKobo, true)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1-Click Review & Custody Confirmation Modal */}
      {reviewModalOpen && selectedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] flex flex-col text-slate-900">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5 flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] text-[#10B981] border border-emerald-200 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Proprietor Physical Cash Custody Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Dual-control reconciliation between Bursar cash drawer and school treasury
                </p>
              </div>
            </div>

            {/* Status Feedback */}
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
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Batch Summary Highlight */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Physical Cash To Verify
                    </span>
                    <div className="text-3xl font-black text-slate-900 mt-0.5">
                      {formatNaira(selectedHandover.amountKobo, true)}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Shift Bursar
                    </span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      {selectedHandover.bursar?.fullName || 'Head Bursar'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {selectedHandover.bursar?.email}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">Receipts Count:</span>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {selectedHandover.receiptCount} Physical Receipt(s)
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px]">Submitted At:</span>
                    <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(selectedHandover.createdAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 text-[11px]">Current Status:</span>
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Awaiting Proprietor
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remittance Teller Reference */}
                {selectedHandover.depositSlipUrl && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Bank Deposit / Pouch Seal Reference:
                    </span>
                    <div className="mt-1 p-2 rounded-xl bg-white border border-slate-200 font-mono text-xs text-blue-700 font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      {selectedHandover.depositSlipUrl}
                    </div>
                  </div>
                )}

                {/* Bursar Notes */}
                {selectedHandover.notes && (
                  <div className="mt-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500">Bursar Notes:</span>
                    <p className="mt-0.5 text-slate-700 bg-white p-2 rounded-xl border border-slate-200 italic">
                      "{selectedHandover.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Itemized Payments Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Linked Cash Receipts In This Batch
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {selectedHandover.payments?.length || 0} receipt(s)
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {selectedHandover.payments && selectedHandover.payments.length > 0 ? (
                    selectedHandover.payments.map((pmt) => (
                      <div
                        key={pmt.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#10B981] flex items-center justify-center flex-shrink-0 border border-emerald-200">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {pmt.invoice?.student
                                ? `${pmt.invoice.student.firstName} ${pmt.invoice.student.lastName}`
                                : 'Student Cash Payment'}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                              <span className="text-blue-600">{pmt.transactionReference}</span>
                              {pmt.invoice?.student?.admissionNumber && (
                                <span>({pmt.invoice.student.admissionNumber})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-black text-slate-900">
                            {formatNaira(pmt.amountKobo, true)}
                          </div>
                          <div className="text-[10px] text-amber-600 font-semibold">
                            Pending Signoff
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No linked payment details found.
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Form */}
              <form onSubmit={handleConfirmCustody} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proprietor Signoff Notes{' '}
                    <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={proprietorNotes}
                    onChange={(e) => setProprietorNotes(e.target.value)}
                    placeholder="e.g., Physical cash counted and verified into school treasury vault."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs text-emerald-800 leading-relaxed">
                  By clicking confirm, you certify that you have physically counted and received{' '}
                  <strong>{formatNaira(selectedHandover.amountKobo, true)}</strong> from the Bursar.
                  This transfers custody to the Proprietor ledger and marks the payments as officially
                  remitted.
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={confirming}
                    className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    {confirming ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Custody...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>
                          Confirm Physical Cash Received ({formatNaira(selectedHandover.amountKobo, true)})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

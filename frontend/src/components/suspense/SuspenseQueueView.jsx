import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Search,
  RefreshCw,
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

export default function SuspenseQueueView({
  suspenseItems = [],
  students = [],
  school,
  onAllocated,
  onRefresh
}) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const totalUnallocatedKobo = suspenseItems.reduce(
    (acc, item) => acc + (item.amountKobo || 0),
    0
  );

  const filteredQueue = suspenseItems.filter((item) => {
    const q = queueSearch.toLowerCase();
    const ref = (item.transactionReference || '').toLowerCase();
    const sender = (item.senderName || '').toLowerCase();
    const dva = (item.attemptedAccountNumber || '').toLowerCase();
    return ref.includes(q) || sender.includes(q) || dva.includes(q);
  });

  const filteredStudents = students.filter((st) => {
    const name = `${st.firstName} ${st.lastName}`.toLowerCase();
    const parent = (st.parentName || '').toLowerCase();
    const grade = (st.classGrade || '').toLowerCase();
    const q = studentSearch.toLowerCase();
    return name.includes(q) || parent.includes(q) || grade.includes(q);
  });

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTx || !targetStudentId) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/suspense/${selectedTx.id}/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          studentId: targetStudentId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Successfully reconciled and credited ${formatNaira(selectedTx.amountKobo)} to the student ledger!`
        });
        setSelectedTx(null);
        setTargetStudentId('');
        if (onAllocated) onAllocated(selectedTx.id);
        if (onRefresh) onRefresh();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Allocation failed. Please check ledger balance.'
        });
      }
    } catch (err) {
      console.error('Suspense allocation failed:', err);
      setStatusMessage({
        type: 'error',
        text: 'Network error communicating with settlement core.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-[#FEF3C7] text-[#F59E0B] border border-amber-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Unallocated Suspense Queue</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#F59E0B] font-bold border border-amber-200">
              {suspenseItems.length} Pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Inbound bank transfer webhooks that could not be automatically matched to an open invoice are parked here to maintain complete audit compliance and prevent phantom balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-5 py-2.5 text-right">
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
              Parked Suspense Volume
            </span>
            <span className="text-lg font-black text-amber-700 tabular-nums">
              {formatNaira(totalUnallocatedKobo, true)}
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Refresh Suspense Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-[#ECFDF5] text-emerald-800 border-emerald-200'
              : 'bg-[#FEE2E2] text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Active Allocation Drawer */}
      {selectedTx && (
        <div className="bg-white border-2 border-emerald-500/40 rounded-2xl p-6 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center border border-emerald-200">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Allocate {formatNaira(selectedTx.amountKobo)}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Ref: {selectedTx.transactionReference} • Sender: {selectedTx.senderName || 'Anonymous'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAllocateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Step 1: Search & Select Target Student
              </label>
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type student name, parent name, or class grade..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
                />
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200/80">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No matching students found.
                  </p>
                ) : (
                  filteredStudents.slice(0, 15).map((st) => {
                    const isSelected = targetStudentId === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => setTargetStudentId(st.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-[#ECFDF5] border-emerald-400 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="text-slate-900 font-semibold">
                            {st.firstName} {st.lastName}
                          </span>
                          <span className="ml-2 text-xs text-slate-500 font-normal">
                            ({st.classGrade}) • Parent: {st.parentName} ({st.parentPhone})
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!targetStudentId || isSubmitting}
                className="bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Allocating to Ledger...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Allocate ₦{(selectedTx.amountKobo / 100).toLocaleString()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Queue Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search queue by reference, sender name, or attempted account..."
            value={queueSearch}
            onChange={(e) => setQueueSearch(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Queue Data Table */}
      {filteredQueue.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3 opacity-90" />
          <h3 className="text-base font-bold text-slate-900">Suspense Queue is Clean!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All bank transfers received have been automatically matched with students. No unidentified deposits exist.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
                <th className="p-4">Date & Reference</th>
                <th className="p-4">Sender & Target DVA</th>
                <th className="p-4">Reconciliation Issue</th>
                <th className="p-4 text-right">Amount (₦)</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 font-mono text-xs">
                      {tx.transactionReference}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">
                      {tx.senderName || 'Inbound Bank Transfer'}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Target DVA: {tx.attemptedAccountNumber || 'Unknown'}
                    </div>
                  </td>
                  <td className="p-4">
                    {tx.reason === 'UNRECOGNIZED_ACCOUNT' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEE2E2] text-rose-700 border border-rose-200">
                        Unrecognized DVA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-amber-800 border border-amber-200">
                        No Open Invoice
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-extrabold text-amber-700 font-mono text-sm">
                    {formatNaira(tx.amountKobo, true)}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTx(tx);
                        setStatusMessage(null);
                        setTargetStudentId('');
                      }}
                      className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Allocate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

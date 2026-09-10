import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  UserCheck,
  Search,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldAlert,
  Building2,
  DollarSign
} from 'lucide-react';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

export default function SuspenseQueueModal({ suspenseItems, students, schoolName, onClose, onAllocated }) {
  const [selectedTx, setSelectedTx] = useState(null);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const formatNaira = (koboAmount) => {
    const naira = (koboAmount || 0) / 100;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(naira);
  };

  const filteredStudents = students.filter((st) => {
    const name = `${st.firstName} ${st.lastName}`.toLowerCase();
    const parent = st.parentName.toLowerCase();
    const q = studentSearch.toLowerCase();
    return name.includes(q) || parent.includes(q) || (st.classGrade && st.classGrade.toLowerCase().includes(q));
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
        body: JSON.stringify({ studentId: targetStudentId })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Deposit successfully allocated to student!'
        });
        setTimeout(() => {
          setSelectedTx(null);
          setTargetStudentId('');
          if (onAllocated) onAllocated();
        }, 1500);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to allocate transaction.'
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Network error occurred while submitting allocation.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-md">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Unallocated Suspense Queue
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                {suspenseItems.length} Pending
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Unmatched bank deposits parked safely for manual bursar allocation to protect financial audit trails.
            </p>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 mb-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            {statusMessage.text}
          </div>
        )}

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {suspenseItems.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-sm font-bold text-white">Suspense Queue Cleared!</h3>
              <p className="text-xs text-slate-400 mt-1">All bank transfers have been successfully matched to student accounts.</p>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="p-3.5">Date & Ref</th>
                    <th className="p-3.5">Sender & DVA</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5 text-right">Amount (₦)</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {suspenseItems.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white font-mono text-[11px]">{tx.transactionReference}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{tx.senderName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          DVA: {tx.attemptedAccountNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {tx.reason === 'UNRECOGNIZED_ACCOUNT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Unrecognized DVA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            No Open Invoice
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-amber-400 text-sm">
                        {formatNaira(tx.amountKobo)}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setStatusMessage(null);
                            setTargetStudentId('');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-xl text-xs shadow-sm transition inline-flex items-center gap-1"
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

          {/* Allocation Selection Drawer / Form */}
          {selectedTx && (
            <div className="bg-slate-800/90 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl animate-fadeIn mt-4">
              <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">
                    Allocate {formatNaira(selectedTx.amountKobo)} ({selectedTx.transactionReference})
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAllocateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Search Enrolled Student Roster
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type student name, parent name, or class..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <select
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Select Student to Credit --</option>
                    {filteredStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.firstName} {st.lastName} ({st.classGrade}) - Parent: {st.parentName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTx(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-700 transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !targetStudentId}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Allocating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Allocation
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

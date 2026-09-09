import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  ExternalLink,
  FileCheck2
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';
import ProprietorCashApprovals from './ProprietorCashApprovals.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CashApprovalsPageView({ school, currentUser, onRefresh }) {
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!school?.id) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/cash/handovers?schoolId=${school.id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.data) {
        setHandovers(data.data);
      }
    } catch (err) {
      console.error('Error fetching cash handovers:', err);
    } finally {
      setLoading(false);
    }
  }, [school?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Listen to handover events for instant live refresh
  useEffect(() => {
    const handleRefresh = () => fetchHistory();
    window.addEventListener('bursaros:cash-handover-confirmed', handleRefresh);
    window.addEventListener('bursaros:cash-drawer-closed', handleRefresh);
    return () => {
      window.removeEventListener('bursaros:cash-handover-confirmed', handleRefresh);
      window.removeEventListener('bursaros:cash-drawer-closed', handleRefresh);
    };
  }, [fetchHistory]);

  const confirmedHandovers = handovers.filter((h) => h.status === 'CONFIRMED_BY_PROPRIETOR');
  const totalConfirmedKobo = confirmedHandovers.reduce((sum, h) => sum + (h.amountKobo || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#10B981] border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Treasury Cash Approvals</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] font-bold border border-emerald-200">
              Dual-Control Protocol
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            School Proprietor custody sign-off. Verify physical cash and bank deposit slips submitted by Bursars at shift closeouts to officially confirm funds into the school treasury.
          </p>
        </div>

        <div className="bg-[#ECFDF5] border border-emerald-200 rounded-2xl px-5 py-3 text-right">
          <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
            Confirmed Remittances
          </span>
          <span className="text-xl font-black text-emerald-700 tabular-nums">
            {formatNaira(totalConfirmedKobo, true)}
          </span>
        </div>
      </div>

      {/* Active Pending Approvals Review Section */}
      <ProprietorCashApprovals
        schoolId={school?.id}
        onConfirmed={() => {
          fetchHistory();
          if (onRefresh) onRefresh();
        }}
      />

      {/* Historical Confirmed Handovers Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Verified Cash Handover Registry</h3>
            <p className="text-xs text-slate-500">Complete audit trail of all verified closeout batches and bank deposit slips.</p>
          </div>
          <button
            onClick={fetchHistory}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10B981]' : ''}`} />
          </button>
        </div>

        {confirmedHandovers.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-90" />
            <h4 className="text-sm font-bold text-slate-900">No Confirmed Handovers Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Once Bursars submit cash closeouts and they are approved by the Proprietor, the signed-off custody records will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase font-semibold">
                  <th className="p-4">Handover Date & ID</th>
                  <th className="p-4">Bursar (Submitter)</th>
                  <th className="p-4">Receipts Count</th>
                  <th className="p-4 text-right">Amount Verified</th>
                  <th className="p-4">Deposit Slip / Notes</th>
                  <th className="p-4 text-center">Sign-off Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {confirmedHandovers.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        BATCH-{h.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(h.confirmedAt || h.createdAt).toLocaleDateString('en-NG', {
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
                        {h.bursar?.fullName || 'School Bursar'}
                      </div>
                      <div className="text-[11px] text-slate-500">Maker Role</div>
                    </td>

                    <td className="p-4 text-slate-600 font-mono">
                      {h.receiptCount} receipts
                    </td>

                    <td className="p-4 text-right font-mono font-bold text-emerald-600 text-sm">
                      {formatNaira(h.amountKobo, true)}
                    </td>

                    <td className="p-4 text-slate-500 max-w-xs truncate">
                      {h.depositSlipUrl ? (
                        <a
                          href={h.depositSlipUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#3B82F6] hover:text-blue-700 font-medium underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Teller / Slip
                        </a>
                      ) : (
                        h.notes || 'No notes provided'
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Confirmed & Locked
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

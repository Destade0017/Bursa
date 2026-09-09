import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Download,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowDownLeft,
  FileSpreadsheet
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function TransactionFeed({ schoolId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');

  const fetchTransactions = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/schools/${schoolId}/transactions`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.data) {
        setTransactions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch transactions stream:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [schoolId]);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const student = tx.invoice?.student;
    const studentName = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
    const ref = (tx.transactionReference || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = studentName.includes(q) || ref.includes(q);
    const matchesChannel = channelFilter === 'ALL' || tx.paymentMethod === channelFilter;

    return matchesSearch && matchesChannel;
  });

  // Export cleared payment list to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    let csvContent = 'Date,Transaction Reference,Student Name,Class,Channel,Amount (NGN)\n';
    filteredTransactions.forEach((tx) => {
      const student = tx.invoice?.student;
      const dateStr = new Date(tx.paidAt).toISOString().slice(0, 10);
      const name = student ? `${student.firstName} ${student.lastName}` : 'N/A';
      const cls = student ? student.classGrade : 'N/A';
      const ref = tx.transactionReference;
      const method = tx.paymentMethod;
      const amount = tx.amountKobo / 100;

      csvContent += `"${dateStr}","${ref}","${name}","${cls}","${method}",${amount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BURSA_Transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#3B82F6] border border-blue-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Live Transactions Audit Stream</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Real-time chronological audit ledger of all bank transfer webhooks and counter cash payments.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredTransactions.length === 0}
          className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-xs transition active:scale-98 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to CSV / Excel
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by transaction ref or student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {['ALL', 'BANK_TRANSFER', 'CASH'].map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  channelFilter === ch
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {ch === 'ALL' ? 'All Channels' : ch.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTransactions}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Refresh Transactions Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#10B981]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Student & Class</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4 text-right">Amount (₦)</th>
                <th className="px-6 py-4 text-center">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#10B981]" />
                    Loading transactions stream...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const student = tx.invoice?.student;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      {/* Date & Time */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(tx.paidAt).toLocaleDateString('en-NG', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Transaction Reference */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 text-xs">
                        {tx.transactionReference}
                      </td>

                      {/* Student & Class */}
                      <td className="px-6 py-4">
                        {student ? (
                          <div>
                            <div className="font-bold text-slate-900">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">{student.classGrade}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Direct Deposit</span>
                        )}
                      </td>

                      {/* Channel */}
                      <td className="px-6 py-4">
                        {tx.paymentMethod === 'CASH' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-amber-800 border border-amber-200">
                            CASH COUNTER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-blue-700 border border-blue-200">
                            BANK DVA
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-right font-black text-emerald-600 font-mono text-sm">
                        +{formatNaira(tx.amountKobo, true)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> CLEARED
                        </span>
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

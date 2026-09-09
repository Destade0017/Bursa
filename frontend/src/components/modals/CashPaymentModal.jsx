import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Receipt } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function CashPaymentModal({
  students = [],
  school,
  onClose,
  onPaymentSuccess
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !amountNaira || !receiptNumber) {
      setStatusMessage({
        type: 'error',
        text: 'Please fill in student, amount, and physical booklet receipt number.'
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const amountKobo = Math.round(parseFloat(amountNaira) * 100);

    try {
      const token = localStorage.getItem('bursar_token');
      const res = await fetch(`${API_BASE}/api/payments/cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          schoolId: school?.id || 'crown-heights',
          studentId: selectedStudentId,
          amountKobo,
          paperReceiptNumber: receiptNumber,
          notes: notes || 'Counter Cash Payment',
          paymentDate
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `₦${Number(amountNaira).toLocaleString()} cash logged successfully! Official receipt generated.`
        });

        setTimeout(() => {
          if (onPaymentSuccess) onPaymentSuccess(data.data);
          onClose();
        }, 1500);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to record cash payment in register.'
        });
      }
    } catch (err) {
      console.error('Cash payment logging error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Network error connecting to school cashier desk.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center border border-emerald-200">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Bursar Counter Cash Office Entry</h3>
            <p className="text-xs text-slate-500">Log physical paper booklet receipts directly into ledger</p>
          </div>
        </div>

        {/* Status Message Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 mb-4 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-[#ECFDF5] text-emerald-800 border-emerald-200'
                : 'bg-[#FEE2E2] text-rose-800 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Student */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Enrolled Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#10B981] focus:bg-white transition"
            >
              <option value="">-- Choose Student --</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.firstName} {st.lastName} ({st.classGrade}) - Parent: {st.parentName}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Paper Receipt Booklet Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Cash Amount (₦)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₦</span>
                <input
                  type="number"
                  min="100"
                  placeholder="e.g. 50000"
                  value={amountNaira}
                  onChange={(e) => setAmountNaira(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Paper Booklet Receipt #
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                required
                placeholder="REC-2026-0042"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Payment Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Bursar Remarks / Note
              </label>
              <input
                type="text"
                placeholder="Paid cash at counter"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#10B981] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedStudentId || !amountNaira}
              className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-xs flex items-center justify-center gap-2 text-xs transition active:scale-98 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Logging Cash Transaction...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirm Cash Receipt Log
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

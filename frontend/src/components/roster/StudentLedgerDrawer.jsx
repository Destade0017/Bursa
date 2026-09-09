import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Send,
  FileText
} from 'lucide-react';
import { formatNaira, generateWhatsAppReminderUrl } from '../../utils/formatters.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function StudentLedgerDrawer({
  student,
  school,
  onClose,
  onSimulatePayment,
  onOpenReceipt
}) {
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const invoice = student?.latestInvoice;
  const dva = student?.virtualAccount;
  const totalBilledKobo = invoice ? invoice.totalAmountKobo : 0;
  const amountPaidKobo = invoice ? invoice.amountPaidKobo : 0;
  const remainingBalanceKobo = Math.max(0, totalBilledKobo - amountPaidKobo);

  // Fetch Payment Timeline Installments
  useEffect(() => {
    if (!invoice) return;
    const fetchPayments = async () => {
      try {
        setLoadingPayments(true);
        const token = localStorage.getItem('bursar_token');
        const res = await fetch(`${API_BASE}/api/invoices/${invoice.id}/payments`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        const data = await res.json();
        if (data.data) {
          setPayments(data.data);
        }
      } catch (err) {
        console.error('Error loading invoice payments:', err);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchPayments();
  }, [invoice]);

  if (!student) return null;

  const handleCopyAccount = () => {
    if (dva?.accountNumber) {
      navigator.clipboard.writeText(dva.accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  const whatsappUrl = generateWhatsAppReminderUrl({
    parentPhone: student.parentPhone,
    parentName: student.parentName,
    studentName: `${student.firstName} ${student.lastName}`,
    classGrade: student.classGrade,
    remainingBalanceNaira: remainingBalanceKobo / 100,
    accountNumber: dva?.accountNumber || 'N/A',
    bankName: dva?.bankName || 'Wema Bank',
    schoolName: school?.name || 'Radiance Bright Stars Academy'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto text-slate-900">
          {/* Drawer Header */}
          <div>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-emerald-200 text-[#10B981] flex items-center justify-center font-bold text-lg">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {student.firstName} {student.lastName}
                  </h3>
                  <span className="text-xs text-[#3B82F6] font-bold bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-blue-200">
                    {student.classGrade}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Section 1: Parent Quick Contacts */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Parent / Guardian Information
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{student.parentName}</div>
                    <div className="text-slate-500 font-mono mt-0.5">{student.parentPhone}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${student.parentPhone}`}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-2xs transition"
                      title="Call Parent"
                    >
                      <Phone className="w-4 h-4 text-blue-600" />
                    </a>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-[#ECFDF5] hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition"
                      title="Send WhatsApp Reminder"
                    >
                      <MessageCircle className="w-4 h-4 text-[#10B981]" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Section 2: Dedicated Virtual Account (DVA) Card */}
              {dva ? (
                <div className="bg-gradient-to-br from-[#EFF6FF] via-white to-[#ECFDF5] rounded-2xl p-4 border border-blue-200/80 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#3B82F6]">
                      Dedicated Virtual Account
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-emerald-200">
                      Active DVA
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xl font-black text-slate-900 tracking-wider">
                        {dva.accountNumber}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">{dva.bankName}</div>
                    </div>

                    <button
                      onClick={handleCopyAccount}
                      className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
                      title="Copy DVA Account Number"
                    >
                      {copiedAccount ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                  No Dedicated Virtual Account assigned.
                </div>
              )}

              {/* Section 3: Financial Summary Gauge */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    First Term 2026/2027 Invoice Status
                  </span>
                  {invoice?.status === 'PAID' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#ECFDF5] text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> FULLY PAID
                    </span>
                  ) : invoice?.status === 'PART_PAID' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FEF3C7] text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 text-amber-600" /> PART PAID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FEE2E2] text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3 text-rose-600" /> UNPAID
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Billed</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {formatNaira(totalBilledKobo, true)}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Cleared</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">
                      {formatNaira(amountPaidKobo, true)}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Balance</div>
                    <div className="text-xs font-bold text-rose-600 mt-0.5">
                      {formatNaira(remainingBalanceKobo, true)}
                    </div>
                  </div>
                </div>

                {/* Line Items Breakdown */}
                {invoice?.items && invoice.items.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Itemized Line Items</div>
                    {invoice.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-slate-600">
                        <span>{item.description}</span>
                        <span className="font-mono text-slate-900 font-semibold">
                          {formatNaira(item.amountKobo, true)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Append-Only Payment History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Payment Timeline & Ledger
                  </h4>
                  <span className="text-[11px] text-slate-400">{payments.length} Installments</span>
                </div>

                {loadingPayments ? (
                  <div className="text-center py-6 text-xs text-slate-400">Loading timeline...</div>
                ) : payments.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                    No payment transactions recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 font-mono text-[11px]">
                            {p.transactionReference}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                p.paymentMethod === 'CASH'
                                  ? 'bg-[#FEF3C7] text-amber-800 border border-amber-200'
                                  : 'bg-[#EFF6FF] text-blue-700 border border-blue-200'
                              }`}
                            >
                              {p.paymentMethod}
                            </span>
                            <span>
                              {new Date(p.paidAt).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-bold text-emerald-600 font-mono">
                          +{formatNaira(p.amountKobo, true)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drawer Actions Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
            <button
              onClick={() => onOpenReceipt(student)}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl text-xs border border-slate-200 shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              View Official Receipt & Exam Pass
            </button>

            {remainingBalanceKobo > 0 && (
              <button
                onClick={() => onSimulatePayment(student)}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-2.5 rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Simulate DVA Bank Transfer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

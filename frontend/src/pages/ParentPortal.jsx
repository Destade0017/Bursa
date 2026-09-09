import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Landmark,
  Copy,
  Check,
  Download,
  Receipt,
  QrCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  ArrowLeft,
  CheckCheck,
  Clock,
  Printer,
  X,
  RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatNaira } from '../utils/formatters.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ParentPortal() {
  const { schoolSlug: routeSchoolSlug, slug } = useParams();
  const schoolSlug = routeSchoolSlug || slug || 'crown-heights';
  const navigate = useNavigate();

  // Search & Retrieval State
  const [searchIdentifier, setSearchIdentifier] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Loaded Student & School Data
  const [schoolData, setSchoolData] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  // UI Interactive States
  const [copiedDva, setCopiedDva] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isExamPassModalOpen, setIsExamPassModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch School Branding / Metadata on Mount
  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/schools`);
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const match =
            json.data.find(
              (s) => s.slug?.toLowerCase() === schoolSlug?.toLowerCase() || s.id === schoolSlug
            ) || json.data[0];
          setSchoolData(match);
        }
      } catch (err) {
        console.error('Failed to load school metadata for parent portal:', err);
      }
    };
    fetchSchool();
  }, [schoolSlug]);

  // Current active student
  const currentStudent = studentList[selectedStudentIndex] || null;
  const activeInvoice = currentStudent?.invoices?.[0] || null;
  const dva = currentStudent?.virtualAccount || null;
  const balanceRemainingKobo = activeInvoice
    ? Math.max(0, (activeInvoice.totalAmountKobo || 0) - (activeInvoice.amountPaidKobo || 0))
    : 0;

  // Student Fee Lookup Handler
  const handleLookup = async (overrideIdentifier, shouldScroll = true) => {
    const query = (overrideIdentifier || searchIdentifier || '').trim();
    if (!query) {
      setSearchError('Please enter a student admission number or parent phone number.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/public/students/lookup?identifier=${encodeURIComponent(query)}&schoolSlug=${encodeURIComponent(schoolSlug)}`
      );

      const data = await res.json();
      if (res.ok && data.student) {
        setCurrentStudent(data.student);
        if (shouldScroll) {
          setTimeout(() => {
            document.getElementById('portal-receipt')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else {
        setSearchError(data.error || 'Student record not found. Please verify admission number or phone.');
      }
    } catch (err) {
      setSearchError('Unable to connect to BURSA servers. Please check your network.');
    } finally {
      setIsSearching(false);
    }
  };

  // Real-time Poll for Payment Confirmation (3-second cadence when on student view)
  useEffect(() => {
    if (!currentStudent || !activeInvoice) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/invoices/public-status/${activeInvoice.id}?schoolSlug=${schoolSlug}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== activeInvoice.status) {
            // Updated payment detected!
            setToastMessage('🎉 Bank transfer confirmed! Student balance updated in real-time.');
            setTimeout(() => setToastMessage(null), 5000);
            handleLookup(searchIdentifier, false);
          }
        }
      } catch (err) {
        // Silently swallow polling errors to preserve UX
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentStudent?.id, activeInvoice?.id, activeInvoice?.status]);

  // Copy Dedicated Virtual Account
  const handleCopyAccountNumber = () => {
    if (!dva?.accountNumber) return;
    navigator.clipboard.writeText(dva.accountNumber);
    setCopiedDva(true);
    setToastMessage(`Copied ${dva.bankName} account number: ${dva.accountNumber}`);
    setTimeout(() => {
      setCopiedDva(false);
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans flex flex-col items-center justify-start p-4 sm:p-6 pb-20 selection:bg-emerald-500 selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 z-50 animate-bounce max-w-sm w-full px-4">
          <div className="bg-[#10B981] text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold">
            <CheckCheck className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container: Mobile Optimized */}
      <div className="w-full max-w-lg mx-auto space-y-5">
        {/* A. Branded School Header */}
        <header className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* School Crest / Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center font-black text-[#10B981] text-base shadow-xs shrink-0">
              CH
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                {schoolData?.name || 'Crown Heights College'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#ECFDF5] text-emerald-800 border border-emerald-200">
                  {schoolData?.activeTerm || 'First Term'} {schoolData?.activeSession || '2026/2027'}
                </span>
                <span className="text-xs text-slate-500 font-medium">Bursar Portal</span>
              </div>
            </div>
          </div>

          {/* Direct Phone Link */}
          {schoolData?.phone && (
            <a
              href={`tel:${schoolData.phone}`}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-[#10B981] rounded-2xl border border-slate-200 transition active:scale-95 shadow-2xs flex items-center justify-center shrink-0"
              title="Call School Bursar"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </header>

        {/* B. Student Lookup Card (Initial State or Search Bar) */}
        {!currentStudent ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                Zero-Login Self Service
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Check Student Fee Status
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Access your child's live fee invoice, cleared payments, and bank transfer account without creating an account or installing an app.
              </p>
            </div>

            {searchError && (
              <div className="p-3.5 bg-[#FEE2E2] border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{searchError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookup();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
                  Student Admission No. or Parent Phone Number
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. 08031234567 or ADM-101"
                    value={searchIdentifier}
                    onChange={(e) => setSearchIdentifier(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:bg-white transition shadow-inner font-medium"
                    required
                  />
                </div>
              </div>

              {/* Quick-Fill Sample Pills for Easy Testing */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Quick Demo Lookup:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchIdentifier('08031234567');
                      handleLookup('08031234567');
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-emerald-700 font-mono transition cursor-pointer"
                  >
                    08031234567 (Phone)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchIdentifier('ADM-101');
                      handleLookup('ADM-101');
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-blue-700 font-mono transition cursor-pointer"
                  >
                    ADM-101 (Admission ID)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-60 text-white rounded-2xl font-bold text-sm shadow-xs transition active:scale-98 cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Searching School Records...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Check Fee Status</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* C. Fee & Payment Hub (Result State) */
          <div className="space-y-5 animate-fadeIn">
            {/* Top Toolbar: Switch / New Search */}
            <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <button
                onClick={() => {
                  setStudentList([]);
                  setSearchIdentifier('');
                }}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Search Another Student</span>
              </button>

              <span className="text-[11px] font-mono text-emerald-800 px-2 py-1 bg-[#ECFDF5] rounded-lg border border-emerald-200 font-semibold">
                Verified Portal
              </span>
            </div>

            {/* Sibling Switcher Tabs (If multiple children exist under the same parent phone) */}
            {studentList.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                  Enrolled Children ({studentList.length}):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {studentList.map((st, idx) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setSelectedStudentIndex(idx);
                        setIsAccordionOpen(false);
                      }}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition border cursor-pointer ${
                        selectedStudentIndex === idx
                          ? 'bg-[#10B981] text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st.displayName} ({st.classGrade})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Student Identity Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] border border-blue-200 text-[#3B82F6] flex items-center justify-center font-black text-sm">
                  {currentStudent.firstName.slice(0, 1)}
                  {currentStudent.maskedLastName.slice(0, 1)}
                </div>
                <div>
                  <div className="text-base font-black text-slate-900">
                    {currentStudent.displayName}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="text-blue-600 font-bold">{currentStudent.classGrade}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{currentStudent.admissionNumber}</span>
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <div>
                {activeInvoice?.status === 'PAID' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#ECFDF5] text-emerald-800 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PAID
                  </span>
                )}
                {activeInvoice?.status === 'PART_PAID' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FEF3C7] text-amber-800 border border-amber-200 shadow-2xs">
                    <Clock className="w-4 h-4 text-amber-600" /> PART PAID
                  </span>
                )}
                {activeInvoice?.status === 'UNPAID' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FEE2E2] text-rose-800 border border-rose-200 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-rose-600" /> UNPAID
                  </span>
                )}
              </div>
            </div>

            {/* 1. Live Balance Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4 relative overflow-hidden">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Fee Balance Due</span>
                <span className="text-emerald-700 font-semibold">
                  {activeInvoice?.term} ({activeInvoice?.academicSession})
                </span>
              </div>

              {/* Outstanding Amount Header */}
              <div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {formatNaira(balanceRemainingKobo, true)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {activeInvoice?.status === 'PAID'
                    ? 'All term school fees fully cleared.'
                    : 'Outstanding balance required before mid-term exams.'}
                </div>
              </div>

              {/* Billed vs Paid Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block mb-1">Total Fee Billed</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatNaira(activeInvoice?.totalAmountKobo || 0, true)}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block mb-1">Amount Paid</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatNaira(activeInvoice?.amountPaidKobo || 0, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. "How to Pay" Dedicated Virtual Account Box */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#10B981]">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      How to Pay
                    </h3>
                    <p className="text-xs text-slate-500">Dedicated Bank Transfer Account</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-emerald-800 font-bold border border-emerald-200 uppercase tracking-wider">
                  Instant Match
                </span>
              </div>

              {dva ? (
                <div className="space-y-4">
                  {/* Account Details Display */}
                  <div className="bg-gradient-to-br from-[#EFF6FF] via-white to-[#ECFDF5] p-4 rounded-xl border border-blue-200/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Bank Name:</span>
                      <span className="font-bold text-slate-900 text-sm">{dva.bankName}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-xs text-slate-500 block mb-1">Account Number:</span>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-slate-900">
                          {dva.accountNumber}
                        </span>
                        <button
                          onClick={handleCopyAccountNumber}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-white transition active:scale-98 shadow-xs cursor-pointer"
                        >
                          {copiedDva ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Beneficiary:</span>
                      <span className="font-medium text-slate-800">{dva.accountName}</span>
                    </div>
                  </div>

                  {/* Instructional Text */}
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    💡 Transfer directly from any mobile banking app (OPay, GTBank, Zenith, Kuda, PalmPay, etc.). Your balance updates automatically within seconds.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  Please contact the school bursar to generate your Dedicated Virtual Account.
                </div>
              )}
            </div>

            {/* 3. Itemized Invoice Breakdown Accordion */}
            {activeInvoice?.items && activeInvoice.items.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#10B981]" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Itemized Fee Breakdown
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                      {activeInvoice.items.length} items
                    </span>
                  </div>
                  {isAccordionOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isAccordionOpen && (
                  <div className="p-5 pt-0 border-t border-slate-100 divide-y divide-slate-100 text-xs">
                    {activeInvoice.items.map((it) => (
                      <div key={it.id} className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-600 font-medium">{it.description}</span>
                        <span className="font-bold text-slate-900">{formatNaira(it.amountKobo, true)}</span>
                      </div>
                    ))}
                    <div className="pt-3 flex items-center justify-between font-black text-sm text-emerald-700">
                      <span>Total Term Bill</span>
                      <span>{formatNaira(activeInvoice.totalAmountKobo, true)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Recent Cleared Payments */}
            {currentStudent.recentPayments && currentStudent.recentPayments.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#10B981]" />
                  Cleared Installments
                </div>
                <div className="space-y-2">
                  {currentStudent.recentPayments.map((pmt) => (
                    <div
                      key={pmt.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-600 block">
                          +{formatNaira(pmt.amountKobo, true)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(pmt.paidAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}{' '}
                          • {pmt.transactionReference}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-emerald-200">
                        CLEARED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Official Digital Documents Buttons */}
            <div className="space-y-3 pt-1">
              {/* Payment Receipt Button (Active if any payment made) */}
              {activeInvoice && activeInvoice.amountPaidKobo > 0 && (
                <button
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs border border-slate-200 shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-[#10B981]" />
                  <span>Download Payment Receipt</span>
                </button>
              )}

              {/* Exam Clearance Pass with QR Code (Only for fully cleared PAID students) */}
              {activeInvoice?.status === 'PAID' && (
                <button
                  onClick={() => setIsExamPassModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl font-bold text-xs shadow-xs transition active:scale-98 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Download Exam Clearance Pass (with QR Code)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Printable Payment Receipt Modal */}
      {isReceiptModalOpen && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-5">
            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Header */}
            <div className="text-center border-b pb-4 space-y-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {schoolData?.name || 'Crown Heights College'}
              </h2>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Official School Fee Payment Receipt
              </p>
              <div className="inline-block bg-[#ECFDF5] text-emerald-800 font-mono text-[11px] px-2.5 py-0.5 rounded-full font-bold mt-1 border border-emerald-200">
                RCP-{currentStudent.admissionNumber}-{Date.now().toString().slice(-6)}
              </div>
            </div>

            {/* Student Details */}
            <div className="text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{currentStudent.displayName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Class Grade:</span>
                <span className="font-bold text-slate-900">{currentStudent.classGrade}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Admission No:</span>
                <span className="font-mono font-bold text-slate-900">{currentStudent.admissionNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Term / Session:</span>
                <span className="font-medium text-slate-900">
                  {activeInvoice?.term} ({activeInvoice?.academicSession})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Billed:</span>
                <span className="font-semibold text-slate-900">
                  {formatNaira(activeInvoice?.totalAmountKobo || 0, true)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700 font-black">
                <span>Total Amount Paid:</span>
                <span>{formatNaira(activeInvoice?.amountPaidKobo || 0, true)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 font-bold">
                <span>Remaining Balance:</span>
                <span>{formatNaira(activeInvoice?.balanceRemainingKobo || 0, true)}</span>
              </div>
            </div>

            {/* Official Stamp Box */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                ✓ Bursar Office Automated Reconciliation
              </div>
              <p className="text-[10px] text-slate-400">
                Issued via BURSA Platform • No physical signature required.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] transition cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Official Exam Clearance Pass Modal (With QR Code) */}
      {isExamPassModalOpen && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 sm:p-8 shadow-2xl relative space-y-6 text-center text-slate-900">
            <button
              onClick={() => setIsExamPassModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] border border-emerald-200 text-[#10B981] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Exam Clearance Pass
              </h3>
              <p className="text-xs text-slate-500">
                {schoolData?.name || 'Crown Heights College'} • {activeInvoice?.term}
              </p>
            </div>

            {/* Verified Student Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="text-sm font-bold text-slate-900">{currentStudent.displayName}</div>
              <div className="text-xs text-emerald-700 font-bold">{currentStudent.classGrade}</div>
              <div className="text-xs font-mono text-slate-500">
                Adm No: {currentStudent.admissionNumber}
              </div>
            </div>

            {/* Dynamic QR Code */}
            <div className="bg-slate-50 p-4 rounded-xl w-44 h-44 mx-auto flex items-center justify-center border border-slate-200 shadow-2xs">
              <QRCodeSVG
                value={JSON.stringify({
                  school: schoolSlug,
                  student: currentStudent.displayName,
                  admissionNo: currentStudent.admissionNumber,
                  term: activeInvoice?.term,
                  status: 'VERIFIED_PAID',
                  verifiedAt: new Date().toISOString()
                })}
                size={144}
                level="M"
              />
            </div>

            <div className="text-xs text-slate-500">
              Scan QR code at the exam hall entrance for instant cryptographic payment verification.
            </div>

            {/* Close / Print Button */}
            <div className="pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-semibold text-xs shadow-xs transition active:scale-98 cursor-pointer"
              >
                Print / Save Exam Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

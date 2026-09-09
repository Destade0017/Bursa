import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  X,
  FileSpreadsheet,
  Users,
  CreditCard,
  Building
} from 'lucide-react';
import { formatNaira } from '../../utils/formatters.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function FeeScheduleManager({
  school,
  students = [],
  token,
  onRefresh,
  onNavigateTab
}) {
  // Filter States
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [selectedSession, setSelectedSession] = useState('2026/2027');

  // Fee Schedules Data State
  const [feeSchedules, setFeeSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Mass Billing States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [massResult, setMassResult] = useState(null);

  // Add / Edit Fee Schedule Modal States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [classGradeInput, setClassGradeInput] = useState('');
  const [lineItems, setLineItems] = useState([
    { description: 'Tuition Fee', amountNaira: '' },
    { description: 'PTA Levy', amountNaira: '' }
  ]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleModalError, setScheduleModalError] = useState(null);

  // Delete Fee Schedule Modal States
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Schedule Handler
  const handleDeleteSchedule = async () => {
    if (!deletingSchedule?.id || !token || !school?.id) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/api/schools/${school.id}/fee-schedules/${deletingSchedule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setDeletingSchedule(null);
        fetchSchedules();
        if (onRefresh) onRefresh();
      } else {
        setErrorMsg(data.error || 'Failed to delete fee schedule.');
        setDeletingSchedule(null);
      }
    } catch (err) {
      setErrorMsg('Network error while deleting fee schedule.');
      setDeletingSchedule(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch Fee Schedules from Backend
  const fetchSchedules = async () => {
    if (!school?.id || !token) return;
    try {
      setLoading(true);
      setErrorMsg(null);

      const url = `${API_BASE}/api/schools/${school.id}/fee-schedules?term=${encodeURIComponent(
        selectedTerm
      )}&academicSession=${encodeURIComponent(selectedSession)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setFeeSchedules(data.data || []);
      } else {
        setErrorMsg(data.error || 'Failed to load fee schedules');
      }
    } catch (err) {
      setErrorMsg('Network error while loading fee schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [school?.id, selectedTerm, selectedSession, token]);

  // Derived Metrics for Mass Billing Banner
  const configuredClassSet = new Set(feeSchedules.map((s) => s.classGrade));
  const uniqueStudentClasses = Array.from(
    new Set(students.map((s) => s.classGrade).filter(Boolean))
  );

  // Calculate estimated total revenue to bill for unbilled or enrolled students
  let estimatedTotalRevenueKobo = 0;
  students.forEach((student) => {
    const match = feeSchedules.find((sched) => sched.classGrade === student.classGrade);
    if (match) {
      estimatedTotalRevenueKobo += match.totalAmountKobo;
    }
  });

  // Handle Mass Invoicing Execution
  const handleTriggerMassBilling = async () => {
    if (!school?.id || !token) return;
    try {
      setIsGenerating(true);
      const res = await fetch(`${API_BASE}/api/schools/${school.id}/invoices/generate-mass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          term: selectedTerm,
          academicSession: selectedSession
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMassResult(data);
        if (onRefresh) onRefresh();
      } else {
        setMassResult({
          success: false,
          message: data.error || 'Failed to generate term invoices.'
        });
      }
    } catch (err) {
      setMassResult({
        success: false,
        message: 'Network error encountered during mass invoicing.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Modal to Add New Schedule
  const handleOpenAddModal = () => {
    setEditingScheduleId(null);
    setClassGradeInput('');
    setLineItems([
      { description: 'Tuition Fee', amountNaira: '' },
      { description: 'PTA Levy', amountNaira: '' }
    ]);
    setScheduleModalError(null);
    setIsScheduleModalOpen(true);
  };

  // Open Modal to Edit Existing Schedule
  const handleOpenEditModal = (schedule) => {
    setEditingScheduleId(schedule.id);
    setClassGradeInput(schedule.classGrade);
    setLineItems(
      schedule.items.map((item) => ({
        description: item.description,
        amountNaira: (item.amountKobo / 100).toString()
      }))
    );
    setScheduleModalError(null);
    setIsScheduleModalOpen(true);
  };

  // Add Dynamic Line Item in Form
  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, { description: '', amountNaira: '' }]);
  };

  // Remove Line Item in Form
  const handleRemoveLineItem = (index) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update Line Item Values
  const handleLineItemChange = (index, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Calculate Modal Total Fee in Real-time
  const modalTotalNaira = lineItems.reduce((acc, curr) => {
    const val = parseFloat(curr.amountNaira);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  // Save Schedule (Upsert)
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!classGradeInput.trim()) {
      setScheduleModalError('Class Grade name is required (e.g., JSS 1, Primary 4).');
      return;
    }

    if (lineItems.length === 0) {
      setScheduleModalError('At least one fee line item is required.');
      return;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const desc = item.description.trim();
      if (!desc) {
        setScheduleModalError(`Line item #${i + 1} requires a valid description.`);
        return;
      }
      const val = parseFloat(item.amountNaira);
      if (isNaN(val) || val <= 0) {
        setScheduleModalError(`Line item "${desc}" must have a valid positive amount greater than ₦0.`);
        return;
      }
    }

    const payloadItems = lineItems.map((it) => ({
      description: it.description.trim(),
      amountNaira: parseFloat(it.amountNaira)
    }));

    try {
      setIsSavingSchedule(true);
      setScheduleModalError(null);

      const res = await fetch(`${API_BASE}/api/fee-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolId: school?.id,
          classGrade: classGradeInput.trim(),
          term: selectedTerm,
          academicSession: selectedSession,
          items: payloadItems
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsScheduleModalOpen(false);
        fetchSchedules();
        if (onRefresh) onRefresh();
      } else {
        setScheduleModalError(data.error || data.details || 'Failed to save fee schedule.');
      }
    } catch (err) {
      setScheduleModalError('Network error while saving fee schedule.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Mass Billing Action Card (Top Banner) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-emerald-200 text-[#10B981] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              1-Click Automation Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Term Billing Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Standardize class fee structures and generate itemized term invoices across the entire student roster with atomic duplicate prevention.
            </p>

            {/* Term & Session Selectors */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-xs text-slate-500 font-semibold">Term:</span>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-transparent text-xs font-bold text-emerald-700 focus:outline-none cursor-pointer"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-xs text-slate-500 font-semibold">Session:</span>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="bg-transparent text-xs font-bold text-blue-700 focus:outline-none cursor-pointer"
                >
                  <option value="2026/2027">2026/2027</option>
                  <option value="2027/2028">2027/2028</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                setMassResult(null);
                setIsConfirmModalOpen(true);
              }}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Generate Invoices for All Students</span>
            </button>
          </div>
        </div>

        {/* Quick Snapshot Metrics */}
        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#10B981]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</div>
              <div className="text-lg font-black text-slate-900">{students.length} Pupils</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#3B82F6]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classes Covered</div>
              <div className="text-lg font-black text-slate-900">
                {configuredClassSet.size} / {Math.max(uniqueStudentClasses.length, configuredClassSet.size)} Classes
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-amber-200 flex items-center justify-center text-[#D97706]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Term Revenue</div>
              <div className="text-lg font-black text-slate-900">{formatNaira(estimatedTotalRevenueKobo, true)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Schedule Configuration Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Class Fee Templates
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active fee structures for <span className="text-emerald-700 font-bold">{selectedTerm}</span> ({selectedSession})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSchedules}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              title="Refresh templates"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Fee Schedule</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Class Grade</th>
                <th className="px-6 py-3.5">Itemized Breakdown</th>
                <th className="px-6 py-3.5">Total Fee</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && feeSchedules.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading class fee schedules...
                  </td>
                </tr>
              ) : feeSchedules.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-slate-500">
                    No fee templates configured for {selectedTerm} {selectedSession}.
                    <br />
                    Click <span className="text-emerald-700 font-bold">+ Add Fee Schedule</span> above to configure one.
                  </td>
                </tr>
              ) : (
                feeSchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-slate-50/70 transition group">
                    {/* Class Grade */}
                    <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#10B981] font-black flex items-center justify-center text-xs">
                          {schedule.classGrade.slice(0, 3)}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{schedule.classGrade}</span>
                      </div>
                    </td>

                    {/* Itemized Breakdown Badges */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {schedule.items.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-50 border border-slate-200 text-slate-700"
                          >
                            <span className="text-slate-500">{item.description}:</span>
                            <span className="font-bold text-slate-900">{formatNaira(item.amountKobo, true)}</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Total Fee */}
                    <td className="px-6 py-4 whitespace-nowrap font-black text-sm text-slate-900">
                      {formatNaira(schedule.totalAmountKobo, true)}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(schedule)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingSchedule(schedule)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Confirmation Modal for Mass Billing */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-xl relative space-y-5 text-slate-900">
            <button
              onClick={() => {
                if (!isGenerating) {
                  setIsConfirmModalOpen(false);
                  setMassResult(null);
                }
              }}
              disabled={isGenerating}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {!massResult ? (
              <>
                <div className="space-y-1.5">
                  <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#10B981]">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Generate Term Invoices</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You are about to issue official school fee invoices for{' '}
                    <span className="text-emerald-700 font-bold">{selectedTerm}</span> ({selectedSession}).
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Enrolled Students:</span>
                    <span className="font-bold text-slate-900">{students.length} pupils</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Classes Covered by Fee Schedules:</span>
                    <span className="font-bold text-emerald-700">{configuredClassSet.size} classes</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold">Estimated Total Revenue to Bill:</span>
                    <span className="font-black text-sm text-slate-900">
                      {formatNaira(estimatedTotalRevenueKobo, true)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    The system automatically prevents duplicate invoices. Students who already have an invoice for this term will be cleanly skipped.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setIsConfirmModalOpen(false)}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTriggerMassBilling}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-5 py-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Invoices...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Generate Invoices</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-5 text-center py-2">
                <div
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                    massResult.success
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {massResult.success ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <AlertTriangle className="w-7 h-7" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">
                    {massResult.success ? 'Invoicing Complete!' : 'Invoicing Notice'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">{massResult.message}</p>
                </div>

                {massResult.success && (
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <div className="text-slate-500 font-semibold">Generated</div>
                      <div className="text-lg font-black text-emerald-700 mt-1">
                        {massResult.generatedCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-semibold">Already Billed</div>
                      <div className="text-lg font-black text-amber-700 mt-1">
                        {massResult.alreadyBilledCount || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-semibold">Skipped</div>
                      <div className="text-lg font-black text-slate-500 mt-1">
                        {massResult.skippedCount || 0}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsConfirmModalOpen(false);
                      setMassResult(null);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Close
                  </button>
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        setIsConfirmModalOpen(false);
                        setMassResult(null);
                        onNavigateTab('roster');
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] transition shadow-xs cursor-pointer"
                    >
                      <span>View Roster & Invoices</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Add / Edit Fee Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-xl relative space-y-5 max-h-[90vh] overflow-y-auto text-slate-900">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {editingScheduleId ? 'Edit Fee Schedule' : 'Configure Class Fee Schedule'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure itemized line items for <span className="text-emerald-700 font-bold">{selectedTerm}</span> ({selectedSession})
              </p>
            </div>

            {scheduleModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{scheduleModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              {/* Class Grade Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Class Grade
                </label>
                <input
                  type="text"
                  placeholder="e.g. JSS 1, Primary 4, SSS 3"
                  value={classGradeInput}
                  onChange={(e) => setClassGradeInput(e.target.value)}
                  disabled={Boolean(editingScheduleId)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
                  required
                />
              </div>

              {/* Dynamic Line Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Itemized Breakdown
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="flex items-center gap-1 text-xs text-[#10B981] hover:text-[#059669] font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Description (e.g., Tuition Fee)"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        required
                      />
                      <div className="relative w-36">
                        <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₦</span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={item.amountNaira}
                          onChange={(e) => handleLineItemChange(idx, 'amountNaira', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                          required
                          min="1"
                        />
                      </div>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Calculated Fee Footer */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Schedule Fee:</span>
                  <span className="text-base font-black text-slate-900">{formatNaira(modalTotalNaira)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] transition active:scale-95 shadow-xs cursor-pointer"
                >
                  {isSavingSchedule ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Fee Schedule</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Fee Schedule Confirmation Modal */}
      {deletingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl relative space-y-4 text-slate-900">
            <button
              onClick={() => setDeletingSchedule(null)}
              disabled={isDeleting}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Delete Fee Schedule</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete the fee schedule for{' '}
                <span className="font-bold text-slate-900">{deletingSchedule.classGrade}</span> ({selectedTerm}{' '}
                {selectedSession})? This action will remove the class fee template.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingSchedule(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSchedule}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

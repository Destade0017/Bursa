import React, { useState } from 'react';
import { X, Loader2, UserPlus, AlertCircle, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeeSchedules } from '../../api/queryHooks.js';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

function formatNairaFromKobo(kobo) {
  if (!kobo || kobo <= 0) return null;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(kobo / 100);
}

export default function AddStudentModal({ schoolId, token, isOpen, onClose, onSuccess, school }) {
  const targetSchoolId = schoolId || school?.id;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [classGrade, setClassGrade] = useState('JSS 1');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const qc = useQueryClient();

  // Fetch fee schedules to show fee hint for the selected class
  const { data: feeSchedules = [] } = useFeeSchedules(targetSchoolId, token);

  // Find matching fee schedule for the selected class
  const matchingSchedule = feeSchedules.find(
    (s) => s.classGrade.trim().toLowerCase() === classGrade.trim().toLowerCase()
  ) || null;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetSchoolId) {
      setError('Active school context not found. Please reload or log in again.');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !parentName.trim() || !parentPhone.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/schools/${targetSchoolId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolId: targetSchoolId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          classGrade: classGrade.trim(),
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Invalidate both students and invoices so the roster reflects the new invoice immediately
        qc.invalidateQueries({ queryKey: ['students', targetSchoolId] });
        qc.invalidateQueries({ queryKey: ['invoices', targetSchoolId] });

        onSuccess && onSuccess(data.data);
        onClose();
        // Reset form
        setFirstName('');
        setLastName('');
        setParentName('');
        setParentPhone('');
      } else {
        setError(data.error || 'Failed to create student record.');
      }
    } catch (err) {
      setError('Network error creating student record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const classOptions = [
    'Nursery 1',
    'Nursery 2',
    'KG 1',
    'KG 2',
    'Primary 1',
    'Primary 2',
    'Primary 3',
    'Primary 4',
    'Primary 5',
    'Primary 6',
    'JSS 1',
    'JSS 2',
    'JSS 3',
    'SSS 1',
    'SSS 2',
    'SSS 3'
  ];

  const feeDisplay = matchingSchedule ? formatNairaFromKobo(matchingSchedule.totalAmountKobo) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl relative text-slate-900 my-auto max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Add New Student
              </h3>
              <p className="text-xs text-slate-500">
                Instantly provisions a Dedicated Virtual Account (DVA).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Samuel"
                required
                className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Adeyemi"
                required
                className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Grade
            </label>
            <select
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-sm text-slate-900 outline-none transition bg-white"
            >
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Full Name
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. Mr. Babatunde Adeyemi"
              required
              className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Phone Number
            </label>
            <input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="e.g. 08031234567"
              required
              className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning DVA...</span>
                </>
              ) : (
                <span>Save Student</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React from 'react';
import { formatNaira } from '../../utils/formatters.js';

export default function MetricRibbon({
  totalBilledKobo = 0,
  totalCollectedKobo = 0,
  totalStudents = 0,
  unpaidStudentsCount = 0
}) {
  const totalOutstandingKobo = Math.max(0, totalBilledKobo - totalCollectedKobo);
  const collectionPercent =
    totalBilledKobo > 0 ? Math.min(100, Math.round((totalCollectedKobo / totalBilledKobo) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Card 1: Total Billed / Target */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">
          Total Billed (Term Target)
        </span>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {formatNaira(totalBilledKobo, true)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-normal">
            Enrolled: {totalStudents} students
          </p>
        </div>
      </div>

      {/* Card 2: Collected Revenue */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
        <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">
          Collected Revenue
        </span>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" />
            <span>{formatNaira(totalCollectedKobo, true)}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-normal">
            {collectionPercent}% of term target recovered
          </p>
        </div>
      </div>

      {/* Card 3: Outstanding Balance / Arrears */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">
            Outstanding Balance
          </span>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {100 - collectionPercent}% remaining
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {formatNaira(totalOutstandingKobo, true)}
          </div>
          {/* Recovery Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${collectionPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 font-normal">
            {unpaidStudentsCount} student{unpaidStudentsCount === 1 ? '' : 's'} with open balance
          </p>
        </div>
      </div>
    </div>
  );
}

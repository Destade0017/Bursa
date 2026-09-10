import React from 'react';
import {
  Building2,
  Calendar,
  RefreshCw,
  PlusCircle,
  Upload,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  UserCheck
} from 'lucide-react';

import BursarCashDrawer from '../cash/BursarCashDrawer.jsx';

export default function Header({
  selectedSchool,
  currentUser,
  refreshing,
  onRefresh,
  onResetDemo,
  onOpenCsvModal,
  onOpenCashModal,
  onLogout
}) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: School Name & Session Metadata */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white leading-none">
                  {selectedSchool?.name || 'School Portal'}
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified DVA Enabled
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  First Term 2026/2027
                </span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live System
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: User Badge & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* User Role Badge */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                {currentUser.fullName ? currentUser.fullName[0] : 'U'}
              </div>
              <div>
                <div className="font-bold text-white leading-none text-[11px]">
                  {currentUser.fullName}
                </div>
                <div className="text-[9px] font-extrabold uppercase text-emerald-400 mt-0.5">
                  {currentUser.role === 'PROPRIETOR' ? 'School Proprietor' : 'Head Bursar'}
                </div>
              </div>
            </div>
          )}

          {/* Reset Demo Data Action */}
          <button
            onClick={onResetDemo}
            title="Reset database to default seed state"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          {/* Bursar Active Cash Drawer & EOD Closeout */}
          {currentUser?.role === 'BURSAR' && (
            <BursarCashDrawer
              schoolId={selectedSchool?.id}
              onCloseoutSuccess={onRefresh}
            />
          )}

          {/* Log Cash Office Payment */}
          <button
            onClick={onOpenCashModal}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition border border-emerald-400/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Cash</span>
          </button>

          {/* Bulk CSV Upload */}
          <button
            onClick={onOpenCsvModal}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline">Import CSV</span>
          </button>

          {/* Log Out Action Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold transition"
              title="Log Out of Portal"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

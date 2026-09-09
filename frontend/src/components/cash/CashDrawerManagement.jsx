import React, { useState } from 'react';
import {
  Wallet,
  ShieldCheck,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  User,
  ArrowRight
} from 'lucide-react';
import BursarCashDrawer from './BursarCashDrawer.jsx';
import ProprietorCashApprovals from './ProprietorCashApprovals.jsx';

export default function CashDrawerManagement({
  school,
  currentUser,
  onOpenCashModal,
  onRefresh
}) {
  const isProprietor = currentUser?.role === 'PROPRIETOR';
  const [activeSubTab, setActiveSubTab] = useState(isProprietor ? 'approvals' : 'drawer');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-white">Cash Drawer & Treasury Custody</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Dual-control cash reconciliation module: Bursars log physical counter receipts and initiate end-of-day closeouts; School Proprietors verify deposit slips and confirm physical bank lodgements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BursarCashDrawer
            schoolId={school?.id}
            onCloseoutSuccess={onRefresh}
          />

          {onOpenCashModal && (
            <button
              onClick={onOpenCashModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Cash</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveSubTab('drawer')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px cursor-pointer ${
            activeSubTab === 'drawer'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Active Shift & Unremitted Drawer</span>
        </button>

        <button
          onClick={() => setActiveSubTab('approvals')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 transition border-b-2 -mb-px cursor-pointer ${
            activeSubTab === 'approvals'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Proprietor Custody Approvals</span>
        </button>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'drawer' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white">Daily Cash Counter Management</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review unremitted receipts in the current shift. Click "Close Shift" above to generate a sealed handover slip for the Proprietor.
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800 text-center py-10">
            <Wallet className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-80" />
            <h4 className="text-sm font-bold text-white mb-1">Cash Desk Operational</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
              Cash recorded at the bursar counter is held in escrow until the end-of-day shift closeout is verified and confirmed by the proprietor.
            </p>
            {onOpenCashModal && (
              <button
                onClick={onOpenCashModal}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                Log New Counter Receipt
              </button>
            )}
          </div>
        </div>
      ) : (
        <ProprietorCashApprovals
          schoolId={school?.id}
          onConfirmed={onRefresh}
        />
      )}
    </div>
  );
}

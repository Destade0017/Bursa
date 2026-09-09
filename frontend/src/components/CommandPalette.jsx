import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Users,
  CalendarCheck,
  Wallet,
  CreditCard,
  ShieldAlert,
  Settings,
  PlusCircle,
  Upload,
  User,
  X,
  Sparkles
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  students = [],
  onSelectStudent,
  onOpenCashModal,
  onOpenCsvModal,
  onOpenAddStudentModal
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger parent open state if controlled outside
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-900 relative">
        <Command label="Global BURSA Command Palette" className="w-full">
          {/* Header Search Input */}
          <div className="flex items-center border-b border-slate-100 px-4 py-3 gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Command.Input
              placeholder="Search students, admission #, or jump to route..."
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Results & Groups */}
          <Command.List className="max-h-96 overflow-y-auto p-2 space-y-2 text-xs">
            <Command.Empty className="py-8 text-center text-slate-400 text-xs">
              No matching records or commands found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              <Command.Item
                onSelect={() => {
                  onClose();
                  onOpenCashModal();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer transition"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-xs">Record Counter Cash Payment</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onClose();
                  onOpenCsvModal();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <Upload className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-xs">Import Students via CSV</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onClose();
                  onOpenAddStudentModal();
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-xs">Add Single Student Record</span>
              </Command.Item>
            </Command.Group>

            {/* Navigation Routes */}
            <Command.Group heading="Navigation Routes" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              <Command.Item
                onSelect={() => handleNavigate('/overview')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-xs">Dashboard Overview</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/students')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-xs">Students & Roster</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/fee-schedules')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <CalendarCheck className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-xs">Fee Schedules Manager</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/cash')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <Wallet className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-xs">Counter Cash Drawer</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/transactions')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-xs">Live Transactions Feed</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/suspense')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span className="font-semibold text-xs">Suspense Queue Exceptions</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleNavigate('/settings')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-xs">Settlement & School Settings</span>
              </Command.Item>
            </Command.Group>

            {/* Student Roster Search */}
            {students.length > 0 && (
              <Command.Group heading="Student Roster Search" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                {students.map((st) => (
                  <Command.Item
                    key={st.id}
                    value={`${st.firstName} ${st.lastName} ${st.admissionNumber || ''} ${st.parentPhone || ''}`}
                    onSelect={() => {
                      onClose();
                      if (onSelectStudent) {
                        onSelectStudent(st);
                      } else {
                        navigate('/students');
                      }
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {st.firstName} {st.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {st.classGrade} • ADM: {st.admissionNumber || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-slate-500">
                      {st.virtualAccount?.accountNumber || ''}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

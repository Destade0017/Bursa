import React from 'react';
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  ShieldAlert,
  MessageCircle,
  Settings,
  Wallet,
  CalendarCheck,
  ShieldCheck,
  LogOut,
  X,
  Building2,
  ChevronRight
} from 'lucide-react';
import { getUserInitials } from '../../utils/formatters.js';

export default function Sidebar({
  activeTab,
  setActiveTab,
  school,
  currentUser,
  studentsCount = 0,
  invoicesCount = 0,
  suspenseCount = 0,
  unpaidCount = 0,
  pendingApprovalsCount = 0,
  isOpen = false,
  onClose,
  onLogout
}) {
  const schoolName = school?.name || currentUser?.schoolName || 'Crown Heights College';
  const userFullName = currentUser?.fullName || 'Administrator';
  const userRole = 'Primary Account';

  const initials = getUserInitials(currentUser);

  const navigationSections = [
    {
      title: 'Core Management',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'roster',
          label: 'Students / Roster',
          icon: Users,
          badge: studentsCount > 0 ? studentsCount : null,
          badgeColor: 'bg-slate-100 text-slate-600 border border-slate-200'
        },
        {
          id: 'billing',
          label: 'Billing',
          icon: Receipt,
          badge: invoicesCount > 0 ? invoicesCount : null,
          badgeColor: 'bg-slate-100 text-slate-600 border border-slate-200'
        },
        {
          id: 'fee-schedules',
          label: 'Fee Schedules',
          icon: CalendarCheck,
          badge: null
        }
      ]
    },
    {
      title: 'Financial & Audit',
      items: [
        {
          id: 'transactions',
          label: 'Transactions',
          icon: CreditCard,
          badge: null
        },
        {
          id: 'suspense',
          label: 'Suspense Queue',
          icon: ShieldAlert,
          badge: suspenseCount > 0 ? suspenseCount : null,
          badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200'
        },
        {
          id: 'reminders',
          label: 'Reminders',
          icon: MessageCircle,
          badge: unpaidCount > 0 ? unpaidCount : null,
          badgeColor: 'bg-blue-50 text-blue-700 border border-blue-200'
        }
      ]
    },
    {
      title: 'Treasury & Cash',
      items: [
        {
          id: 'cash-drawer',
          label: 'Cash Drawer',
          icon: Wallet,
          badge: null
        },
        {
          id: 'cash-approvals',
          label: 'Cash Approvals',
          icon: ShieldCheck,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
          badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200'
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          badge: null
        }
      ]
    }
  ];

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none bg-white text-slate-800">
      {/* Top Branding & School Context */}
      <div className="shrink-0">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/bursar-logo.png"
              alt="BURSA Logo"
              className="w-10 h-10 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-slate-900 tracking-tight leading-none">BURSA</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">School Finance Platform</p>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Active School Badge Card */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                {schoolName}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="truncate">First Term 2026/2027</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links (Scrollable area) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {section.title}
            </div>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-[#ECFDF5] text-[#10B981] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'text-[#10B981]' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        item.badgeColor || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Profile Section at the Bottom */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#10B981] font-bold text-xs flex items-center justify-center border border-emerald-200 shrink-0">
              {initials || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                {userFullName}
              </div>
              <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                {userRole}
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
              title="Sign Out of BURSA"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 xl:w-72 bg-white border-r border-slate-200/90 flex-col shrink-0 fixed inset-y-0 left-0 z-30 min-h-screen shadow-xs">
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden animate-fadeIn"
        />
      )}

      {/* Mobile Off-Canvas Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Menu } from 'lucide-react';
import { getUserInitials } from '../../utils/formatters.js';

export default function AppHeader({
  selectedSchool,
  currentUser,
  onLogout,
  onOpenCommandPalette,
  onOpenMobileMenu,
  activeTabTitle
}) {
  const schoolName = selectedSchool?.name || currentUser?.schoolName || currentUser?.school?.name || 'School Portal';
  const fullName = currentUser?.fullName || 'Administrator';
  const roleName = currentUser?.role === 'PROPRIETOR' ? 'Proprietor' : 'Head Bursar';

  // Compute clean initials for avatar (e.g. "EO" for Emmanuel Okon, skipping "Mr.")
  const initials = getUserInitials(currentUser);

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + School Identity */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {schoolName}
            </h1>
            <span className="hidden md:inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80 shrink-0">
              First Term 2026/2027
            </span>
            {activeTabTitle && (
              <span className="hidden xl:inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0">
                <span>/</span>
                <span className="text-slate-700 font-semibold">{activeTabTitle}</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-400 hover:text-slate-600 px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer max-w-xs w-full shadow-2xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search student, admission #...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Right: User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 pl-3 py-1">
            {/* Initials Avatar */}
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200/90 shadow-2xs">
              {initials || 'U'}
            </div>

            {/* Name and Role Badge */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">{fullName}</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                {roleName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

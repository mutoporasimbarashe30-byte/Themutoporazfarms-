import React from 'react';
import { Menu, Bell, User, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { NavModule } from './Sidebar.tsx';

interface HeaderProps {
  currentModule: NavModule;
  onOpenMobileNav: () => void;
  onOpenProfile: () => void;
  alertCount: number;
  onNavigateAlerts?: () => void;
}

const moduleTitles: Record<NavModule, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Farm Executive Dashboard',
    subtitle: 'Real-time livestock census, critical health notices, feed inventory & gestation schedules',
  },
  animals: {
    title: 'Livestock Registry',
    subtitle: 'Individual tagging for pigs and ostriches, batch tracking for flocks and nursery chicks',
  },
  births_deaths: {
    title: 'Births & Mortality Tracking',
    subtitle: 'Farrowing, hatching logs, mortality cause diagnostics, and species survival analytics',
  },
  health: {
    title: 'Veterinary Health & Pharmacy',
    subtitle: 'Clinical diagnostics, treatment administration with live stock deduction, and drug reference guide',
  },
  feed: {
    title: 'Nutrition & Feed Silos',
    subtitle: 'Daily ration logging, automatic inventory deductions, and species consumption analytics',
  },
  breeding: {
    title: 'Breeding & Gestation Management',
    subtitle: 'Natural mating & AI logs, gestation milestones (114d pig, 21d hen, 42d ostrich), conception rates',
  },
  reports: {
    title: 'Farm Analytics & Exports',
    subtitle: 'Filterable farm records with instant CSV and official branded PDF export',
  },
  users: {
    title: 'Personnel & System Audit Trail',
    subtitle: 'Staff credentials, role-based security enforcement, and timestamped activity logs',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onOpenMobileNav,
  onOpenProfile,
  alertCount,
  onNavigateAlerts,
}) => {
  const { user, isAdmin, isVet, isWorker } = useAuth();
  const info = moduleTitles[currentModule] || { title: 'Farm Management', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Nav Toggle & Current View Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            id="mobile-nav-toggle"
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-hidden"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {info.title}
            </h2>
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Notifications & Current User Info */}
        <div className="flex items-center gap-3 shrink-0">
          {alertCount > 0 && (
            <button
              id="header-alerts-trigger"
              onClick={onNavigateAlerts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors shadow-2xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>{alertCount} Alerts</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User profile capsule */}
          <button
            id="header-profile-capsule"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-slate-800 leading-none">
                {user?.full_name?.split(' ')[0] || 'User'}
              </div>
              <div className="text-[10px] text-slate-500 capitalize leading-tight">
                {user?.role}
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

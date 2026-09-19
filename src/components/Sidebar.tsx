import React from 'react';
import {
  LayoutDashboard,
  Shield,
  HeartPulse,
  Wheat,
  Dna,
  Users,
  FileSpreadsheet,
  Baby,
  Skull,
  X,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Role } from '../types/index.ts';

export type NavModule =
  | 'dashboard'
  | 'animals'
  | 'births_deaths'
  | 'health'
  | 'feed'
  | 'breeding'
  | 'users'
  | 'reports';

interface SidebarProps {
  currentModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenProfile: () => void;
  alertCounts: {
    feed: number;
    medicine: number;
    dueDates: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  isOpenMobile,
  onCloseMobile,
  onOpenProfile,
  alertCounts,
}) => {
  const { user, isAdmin, isWorker, isVet, logout, switchDemoRole } = useAuth();

  const totalAlerts = alertCounts.feed + alertCounts.medicine + alertCounts.dueDates;

  const navItems = [
    {
      id: 'dashboard' as NavModule,
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
      badge: totalAlerts > 0 ? `${totalAlerts}` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      visible: true,
    },
    {
      id: 'animals' as NavModule,
      label: 'Animal Registry',
      icon: Shield,
      visible: true, // all see, though workers get data-entry
    },
    {
      id: 'births_deaths' as NavModule,
      label: 'Births & Deaths',
      icon: Baby,
      visible: true,
    },
    {
      id: 'health' as NavModule,
      label: 'Health & Diseases',
      icon: HeartPulse,
      badge: alertCounts.medicine > 0 ? `${alertCounts.medicine}` : undefined,
      badgeColor: 'bg-red-500 text-white',
      visible: true,
    },
    {
      id: 'feed' as NavModule,
      label: 'Feed Management',
      icon: Wheat,
      badge: alertCounts.feed > 0 ? `${alertCounts.feed}` : undefined,
      badgeColor: 'bg-amber-500 text-white',
      visible: !isVet, // Vet specializes in health; or isVet has read access
    },
    {
      id: 'breeding' as NavModule,
      label: 'Breeding & Repro',
      icon: Dna,
      badge: alertCounts.dueDates > 0 ? `${alertCounts.dueDates}` : undefined,
      badgeColor: 'bg-purple-600 text-white',
      visible: !isVet,
    },
    {
      id: 'reports' as NavModule,
      label: 'Reports & Exports',
      icon: FileSpreadsheet,
      visible: true,
    },
    {
      id: 'users' as NavModule,
      label: 'Manage Users & Audit',
      icon: Users,
      visible: isAdmin, // Strictly admin only
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="mobile-nav-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-emerald-950 text-slate-100 flex flex-col border-r border-emerald-900/50 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-emerald-900/60 bg-emerald-900/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md ring-2 ring-emerald-400/30">
              M
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
                The Mutoporaz
              </h1>
              <span className="text-xs font-medium text-emerald-300 tracking-wide uppercase">
                Livestock Farm
              </span>
            </div>
          </div>
          <button
            id="close-sidebar-btn"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Status Bar */}
        <div className="px-5 py-3.5 bg-emerald-900/40 border-b border-emerald-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.full_name || 'Guest'}
                </div>
                <div className="text-[11px] text-emerald-300 flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      isAdmin
                        ? 'bg-amber-400'
                        : isVet
                        ? 'bg-cyan-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span className="capitalize">{user?.role || 'worker'}</span>
                </div>
              </div>
            </div>

            <button
              id="profile-nav-trigger"
              onClick={() => {
                onOpenProfile();
                onCloseMobile();
              }}
              title="Edit Profile"
              className="p-1.5 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
            Operations & Management
          </div>

          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    onSelectModule(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40'
                      : 'text-emerald-100/80 hover:text-white hover:bg-emerald-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-white' : 'text-emerald-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-emerald-700 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Quick Role Switcher (For Evaluation & Demo testing) */}
        <div className="p-3.5 border-t border-emerald-900/60 bg-emerald-950/80">
          <div className="text-[10px] uppercase font-bold text-emerald-400/70 mb-1.5 px-1">
            Switch Active Role (Demo)
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              id="switch-to-admin-btn"
              onClick={() => switchDemoRole('admin')}
              className={`py-1.5 px-2 rounded-lg font-medium text-center transition-colors ${
                isAdmin
                  ? 'bg-amber-500 text-white font-bold'
                  : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
              }`}
            >
              SIMBA (Admin)
            </button>
            <button
              id="switch-to-worker-btn"
              onClick={() => switchDemoRole('worker')}
              className={`py-1.5 px-2 rounded-lg font-medium text-center transition-colors ${
                isWorker
                  ? 'bg-emerald-500 text-white font-bold'
                  : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
              }`}
            >
              Moyo (Worker)
            </button>
            <button
              id="switch-to-vet-btn"
              onClick={() => switchDemoRole('vet')}
              className={`py-1.5 px-2 rounded-lg font-medium text-center transition-colors ${
                isVet
                  ? 'bg-cyan-500 text-white font-bold'
                  : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
              }`}
            >
              Dr. Chikore (Vet)
            </button>
          </div>
        </div>

        {/* Footer info & Logout */}
        <div className="p-3.5 border-t border-emerald-900/80 bg-emerald-900/20 flex items-center justify-between text-xs text-emerald-300">
          <span className="text-[11px] truncate">
            Pigs • Hens • Ostriches
          </span>
          <button
            id="logout-btn"
            onClick={logout}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/80 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

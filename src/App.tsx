import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Sidebar, NavModule } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { LoginView } from './components/LoginView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AnimalRegistryView } from './components/AnimalRegistryView.tsx';
import { BirthsDeathsView } from './components/BirthsDeathsView.tsx';
import { HealthManagementView } from './components/HealthManagementView.tsx';
import { FeedManagementView } from './components/FeedManagementView.tsx';
import { BreedingReproductionView } from './components/BreedingReproductionView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { UserManagementView } from './components/UserManagementView.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { api } from './lib/api.ts';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [currentModule, setCurrentModule] = useState<NavModule>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Live alert counts for badges
  const [alertCounts, setAlertCounts] = useState({
    feed: 0,
    medicine: 0,
    dueDates: 0,
  });

  const fetchAlerts = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get<any>('/dashboard/overview');
      if (res) {
        setAlertCounts({
          feed: res.lowFeedAlerts?.length || 0,
          medicine: res.lowMedicineAlerts?.length || 0,
          dueDates: res.upcomingDueDates?.length || 0,
        });
      }
    } catch {
      // Background poll silently fails if token expires or server rebooting
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentModule]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-2xl mb-4 animate-pulse">
          M
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          The Mutoporaz Farms System Initializing...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderModuleView = () => {
    switch (currentModule) {
      case 'dashboard':
        return <DashboardView onNavigate={(mod) => setCurrentModule(mod)} />;
      case 'animals':
        return <AnimalRegistryView />;
      case 'births_deaths':
        return <BirthsDeathsView />;
      case 'health':
        return <HealthManagementView />;
      case 'feed':
        return <FeedManagementView />;
      case 'breeding':
        return <BreedingReproductionView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return isAdmin ? (
          <UserManagementView />
        ) : (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-600">
            <h3 className="font-bold text-slate-800 text-base mb-1">Access Restricted</h3>
            <p className="text-xs">
              Personnel and security management is restricted to Farm Director SIMBA.
            </p>
          </div>
        );
      default:
        return <DashboardView onNavigate={(mod) => setCurrentModule(mod)} />;
    }
  };

  const totalAlerts = alertCounts.feed + alertCounts.medicine + alertCounts.dueDates;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={(mod) => setCurrentModule(mod)}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        onOpenProfile={() => setShowProfileModal(true)}
        alertCounts={alertCounts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        <Header
          currentModule={currentModule}
          onOpenMobileNav={() => setIsOpenMobile(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          alertCount={totalAlerts}
          onNavigateAlerts={() => setCurrentModule('dashboard')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderModuleView()}
        </main>
      </div>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

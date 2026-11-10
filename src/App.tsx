/**
 * Pocket Pilot - Personal Life & Expense Manager
 * Mobile-first, local-first with Google Drive auto-sync.
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { MobileNav } from './components/layout/MobileNav';
import { HomeDashboard } from './components/home/HomeDashboard';
import { ExpensesModule } from './components/expenses/ExpensesModule';
import { BikeModule } from './components/bike/BikeModule';
import { CreditCardModule } from './components/creditcards/CreditCardModule';
import { SuppliesModule } from './components/supplies/SuppliesModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { GoogleSignInModal } from './components/auth/GoogleSignInModal';
import { ConflictDialog } from './components/common/ConflictDialog';
import { GlobalQuickAddModals } from './components/modals/GlobalQuickAddModals';

const MainShell: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <Header />

      {/* Main Workspace */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <DesktopSidebar />

        {/* Dynamic View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'expenses' && <ExpensesModule />}
          {activeTab === 'bike' && <BikeModule />}
          {activeTab === 'cards' && <CreditCardModule />}
          {activeTab === 'supplies' && <SuppliesModule />}
          {activeTab === 'settings' && <SettingsModule />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Modals & Dialogs */}
      <GoogleSignInModal />
      <ConflictDialog />
      <GlobalQuickAddModals />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}

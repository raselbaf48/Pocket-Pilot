import React from 'react';
import {
  Home,
  Receipt,
  Bike,
  CreditCard,
  PackageCheck,
  Settings,
  Plus,
  Compass,
  Cloud,
  LogOut,
  Fuel,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useApp, NavTab } from '../../context/AppContext';
import { toISODate, addMonthsToDate, getDaysDifference } from '../../utils/format';

export const DesktopSidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setQuickAddType,
    userProfile,
    setIsAuthModalOpen,
    logout,
    data
  } = useApp();

  const today = toISODate();
  const supplyDueCount = data.supplyItems.filter(item => {
    if (item.deleted) return false;
    const nextDue = addMonthsToDate(item.lastIssueDate, item.cycleMonths);
    const diff = getDaysDifference(nextDue, today);
    return diff <= 0;
  }).length;

  const navItems: { tab: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; desc: string }[] = [
    { tab: 'home', label: 'Dashboard', icon: Home, desc: 'Overview & 6-month trends' },
    { tab: 'expenses', label: 'Expenses', icon: Receipt, desc: 'Daily spend, bKash & budgets' },
    { tab: 'bike', label: 'Bike Manager', icon: Bike, desc: 'Fuel logs, km/l & service' },
    { tab: 'cards', label: 'Credit Cards', icon: CreditCard, desc: 'Limits, statements & due dates' },
    { tab: 'supplies', label: 'Supply Items', icon: PackageCheck, badge: supplyDueCount, desc: 'Quarterly & annual issues' },
    { tab: 'settings', label: 'Settings', icon: Settings, desc: 'Drive sync, backup & export' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/80 p-4 shrink-0 h-[calc(100vh-57px)] sticky top-[57px] justify-between">
      <div className="space-y-6">
        {/* Navigation Items */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition group text-left ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    {item.badge} due
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Quick Add Actions */}
        <div className="pt-2">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Quick Actions
          </div>
          <div className="space-y-1.5 mt-1">
            <button
              onClick={() => setQuickAddType('expense')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 hover:text-white transition group"
            >
              <div className="w-5 h-5 rounded-md bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs">
                +
              </div>
              <span>Add Expense</span>
            </button>
            <button
              onClick={() => setQuickAddType('fuel')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 hover:text-white transition group"
            >
              <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                +
              </div>
              <span>Fuel Fill-up</span>
            </button>
            <button
              onClick={() => setQuickAddType('card_spend')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-xs text-slate-300 hover:text-white transition group"
            >
              <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                +
              </div>
              <span>Card Spend</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer User & Cloud status */}
      <div className="border-t border-slate-800 pt-3">
        {userProfile ? (
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {userProfile.picture ? (
                <img
                  src={userProfile.picture}
                  alt={userProfile.name}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-teal-500/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-teal-600/30 text-teal-300 flex items-center justify-center text-xs font-bold">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {userProfile.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <Cloud className="w-2.5 h-2.5 text-teal-400" />
                  <span>Google Drive Synced</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full p-2.5 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/30 hover:border-teal-500/50 text-left transition group"
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
              <div className="text-xs font-semibold text-teal-300">Sign in with Google</div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Save & sync data to your private Google Drive
            </p>
          </button>
        )}
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import {
  Home,
  Receipt,
  Bike,
  CreditCard,
  PackageCheck,
  Plus,
  Settings,
  Fuel,
  Sparkles,
  X
} from 'lucide-react';
import { useApp, NavTab } from '../../context/AppContext';
import { toISODate, addMonthsToDate, getDaysDifference } from '../../utils/format';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, setQuickAddType, data } = useApp();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  // Compute supply items due
  const today = toISODate();
  const warningDays = data.settings?.defaultDueWarningDays || 30;
  
  const supplyDueCount = data.supplyItems.filter(item => {
    if (item.deleted) return false;
    const nextDue = addMonthsToDate(item.lastIssueDate, item.cycleMonths);
    const diff = getDaysDifference(nextDue, today);
    return diff <= 0; // Due or Overdue
  }).length;

  const navItems: { tab: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { tab: 'home', label: 'Home', icon: Home },
    { tab: 'expenses', label: 'Expenses', icon: Receipt },
    { tab: 'bike', label: 'Bike', icon: Bike },
    { tab: 'cards', label: 'Cards', icon: CreditCard },
    { tab: 'supplies', label: 'Supplies', icon: PackageCheck, badge: supplyDueCount },
  ];

  return (
    <>
      {/* Quick Action Floating Menu Overlay */}
      {isQuickMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fade-in"
          onClick={() => setIsQuickMenuOpen(false)}
        >
          <div
            className="absolute bottom-20 right-4 left-4 max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl space-y-2 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Quick Add</span>
              <button
                onClick={() => setIsQuickMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setIsQuickMenuOpen(false);
                setQuickAddType('expense');
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-left transition"
            >
              <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">+ Daily Expense</div>
                <div className="text-xs text-slate-400">Record cash, bKash, food, bills</div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsQuickMenuOpen(false);
                setQuickAddType('fuel');
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-left transition"
            >
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">+ Fuel Fill-up</div>
                <div className="text-xs text-slate-400">Log liters, odometer, km/l</div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsQuickMenuOpen(false);
                setQuickAddType('card_spend');
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-left transition"
            >
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">+ Card Spend</div>
                <div className="text-xs text-slate-400">Merchant charge, POS, EMI</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md md:hidden px-2 py-1.5 safe-area-pb">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setActiveTab(item.tab);
                  setIsQuickMenuOpen(false);
                }}
                className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
                  isActive ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500 text-slate-950 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 bg-teal-400 rounded-full mt-0.5"></span>
                )}
              </button>
            );
          })}

          {/* Quick Add Floating Button */}
          <button
            onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
            className="flex flex-col items-center justify-center p-1.5 text-slate-200 hover:text-white"
            aria-label="Quick Add"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/30 active:scale-90 transition">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[10px] mt-0.5 text-slate-400">Add</span>
          </button>
        </div>
      </nav>
    </>
  );
};

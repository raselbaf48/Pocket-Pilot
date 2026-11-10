import React from 'react';
import {
  Receipt,
  TrendingUp,
  CreditCard as CardIcon,
  Fuel,
  PackageCheck,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatTaka, formatDateDDMMMYY, toISODate, addMonthsToDate, getDaysDifference } from '../../utils/format';

export const HomeDashboard: React.FC = () => {
  const { data, setActiveTab, setQuickAddType } = useApp();

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = toISODate();

  // 1. This month's total spending & income
  const thisMonthExpenses = data.expenses.filter(
    e => !e.deleted && e.type === 'expense' && e.date.startsWith(currentYearMonth)
  );
  const thisMonthTotalSpend = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const thisMonthIncome = data.expenses
    .filter(e => !e.deleted && e.type === 'income' && e.date.startsWith(currentYearMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  // 2. Credit Card Outstanding (Total unpaid balance across active cards)
  const totalCardTransactions = data.cardTransactions
    .filter(t => !t.deleted)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCardPayments = data.cardPayments
    .filter(p => !p.deleted)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalCardOutstanding = Math.max(0, totalCardTransactions - totalCardPayments);

  // CC Payment Due Alert (< 5 days)
  const activeCards = data.creditCards.filter(c => !c.deleted);
  const upcomingCardBills = activeCards.map(card => {
    // Current statement cycle
    const day = now.getDate();
    const statementDay = card.statementDay || 15;
    const dueDays = card.paymentDueDays || 20;
    
    // Approximate next payment due date
    const dueDate = new Date(now.getFullYear(), now.getMonth(), statementDay + dueDays);
    const dueDateStr = toISODate(dueDate);
    const daysUntilDue = getDaysDifference(dueDateStr, todayStr);
    return { card, dueDateStr, daysUntilDue };
  }).filter(b => b.daysUntilDue >= 0 && b.daysUntilDue <= 5);

  // 3. Last bike fuel average (km/l)
  // Calculate from consecutive full-tank logs
  const activeVehicles = data.vehicles.filter(v => !v.deleted);
  const primaryVehicle = activeVehicles[0];
  const vehicleFuelLogs = data.fuelLogs
    .filter(f => !f.deleted && (!primaryVehicle || f.vehicleId === primaryVehicle.id))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.odometer - b.odometer);

  let lastFuelKmpl: number | null = null;
  if (vehicleFuelLogs.length >= 2) {
    // find latest pair with full tank
    for (let i = vehicleFuelLogs.length - 1; i >= 1; i--) {
      const current = vehicleFuelLogs[i];
      const prev = vehicleFuelLogs[i - 1];
      if (current.isFullTank && prev.isFullTank && current.odometer > prev.odometer && current.liters > 0) {
        lastFuelKmpl = (current.odometer - prev.odometer) / current.liters;
        break;
      }
    }
  }

  // 4. Supply items due or due soon
  const warningDays = data.settings?.defaultDueWarningDays || 30;
  const supplyItemsWithStatus = data.supplyItems
    .filter(i => !i.deleted)
    .map(item => {
      const nextDue = addMonthsToDate(item.lastIssueDate, item.cycleMonths);
      const diff = getDaysDifference(nextDue, todayStr);
      const isDue = diff <= 0;
      const isDueSoon = diff > 0 && diff <= warningDays;
      return { item, nextDue, diff, isDue, isDueSoon };
    });

  const dueOrDueSoonSupplies = supplyItemsWithStatus.filter(s => s.isDue || s.isDueSoon);

  // 5. Last 6 Months Spending Chart data
  const monthLabels: { label: string; yearMonth: string; totalSpend: number; totalIncome: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mName = d.toLocaleString('default', { month: 'short' });
    
    const spend = data.expenses
      .filter(e => !e.deleted && e.type === 'expense' && e.date.startsWith(ym))
      .reduce((sum, e) => sum + e.amount, 0);
    const inc = data.expenses
      .filter(e => !e.deleted && e.type === 'income' && e.date.startsWith(ym))
      .reduce((sum, e) => sum + e.amount, 0);

    monthLabels.push({
      label: mName,
      yearMonth: ym,
      totalSpend: spend,
      totalIncome: inc,
    });
  }
  const maxMonthlySpend = Math.max(...monthLabels.map(m => m.totalSpend), 10000);

  // 6. Recent activity (combined expenses & card transactions)
  const recentExpenses = data.expenses
    .filter(e => !e.deleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const categoryMap = new Map<string, string>();
  data.categories.forEach(c => categoryMap.set(c.id, c.name));

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Pilot Dashboard
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">
              {formatDateDDMMMYY(todayStr)}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 mt-1">
            Life & Finances at a Glance
          </h2>
        </div>

        {/* Quick Add Pill Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setQuickAddType('expense')}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-teal-500/20 hover:bg-teal-400 active:scale-95 transition shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Expense</span>
          </button>
          <button
            onClick={() => setQuickAddType('fuel')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold active:scale-95 transition shrink-0"
          >
            <Fuel className="w-3.5 h-3.5" />
            <span>Fuel</span>
          </button>
          <button
            onClick={() => setQuickAddType('card_spend')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold active:scale-95 transition shrink-0"
          >
            <CardIcon className="w-3.5 h-3.5" />
            <span>Card</span>
          </button>
        </div>
      </div>

      {/* Bill Due Alerts if within 5 days */}
      {upcomingCardBills.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-amber-300">
                Credit Card Payment Due Soon!
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {upcomingCardBills[0].card.name} is due on {formatDateDDMMMYY(upcomingCardBills[0].dueDateStr)} ({upcomingCardBills[0].daysUntilDue} days left).
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('cards')}
            className="px-2.5 py-1 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg shrink-0"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Top 4 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Monthly Spend */}
        <div
          onClick={() => setActiveTab('expenses')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">This Month Spend</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-100 font-mono tracking-tight">
              {formatTaka(thisMonthTotalSpend)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-medium">Income: {formatTaka(thisMonthIncome)}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Credit Card Outstanding */}
        <div
          onClick={() => setActiveTab('cards')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Card Outstanding</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
              <CardIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-indigo-300 font-mono tracking-tight">
              {formatTaka(totalCardOutstanding)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {activeCards.length} active card{activeCards.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Metric 3: Bike Fuel Average */}
        <div
          onClick={() => setActiveTab('bike')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Last Fuel Avg</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-cyan-300 font-mono tracking-tight">
              {lastFuelKmpl ? `${lastFuelKmpl.toFixed(1)} km/l` : '—'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 truncate">
              {primaryVehicle ? primaryVehicle.name : 'No vehicle'}
            </div>
          </div>
        </div>

        {/* Metric 4: Supply Items Due / Soon */}
        <div
          onClick={() => setActiveTab('supplies')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Supplies Due</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono tracking-tight">
              {dueOrDueSoonSupplies.length} <span className="text-xs font-normal text-slate-400">items</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {supplyItemsWithStatus.filter(s => s.isDue).length} ready to issue
            </div>
          </div>
        </div>
      </div>

      {/* 6-Month Spending Trend Chart */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">6-Month Spending Trend</h3>
            <p className="text-xs text-slate-400">Monthly expense velocity in Bangladeshi Taka (৳)</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span> Spend
            </span>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-800">
          {monthLabels.map((m, idx) => {
            const heightPercent = Math.max(6, Math.min(100, Math.round((m.totalSpend / maxMonthlySpend) * 100)));
            const isCurrentMonth = idx === monthLabels.length - 1;

            return (
              <div key={m.yearMonth} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {formatTaka(m.totalSpend)}
                </span>
                <div className="w-full max-w-[40px] bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-full">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isCurrentMonth
                        ? 'bg-gradient-to-t from-teal-600 to-teal-400 shadow-lg shadow-teal-500/20'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-medium ${isCurrentMonth ? 'text-teal-300 font-bold' : 'text-slate-400'}`}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Supplies Requiring Attention & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Supplies Ready or Due Soon */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                Job Supply Items Status
              </h3>
              <button
                onClick={() => setActiveTab('supplies')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dueOrDueSoonSupplies.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                All supply items are up to date! None due in the next {warningDays} days.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dueOrDueSoonSupplies.slice(0, 4).map(({ item, nextDue, isDue, diff }) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveTab('supplies')}
                    className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cycle: {item.cycleMonths} mos • Max Qty: {item.maxQty} {item.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      {isDue ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Due Now ({Math.abs(diff)}d over)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          Due in {diff} days
                        </span>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Due: {formatDateDDMMMYY(nextDue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Daily Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-400" />
                Recent Daily Expenses
              </h3>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No expenses logged yet. Tap + Expense to record your first spend.
              </div>
            ) : (
              <div className="space-y-2">
                {recentExpenses.map(exp => {
                  const isIncome = exp.type === 'income';
                  const catName = categoryMap.get(exp.categoryId) || 'General';
                  return (
                    <div
                      key={exp.id}
                      className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-lg text-xs shrink-0 ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {exp.note || catName}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{formatDateDDMMMYY(exp.date)}</span>
                            <span>•</span>
                            <span className="font-mono">{exp.paymentMethod}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-bold font-mono ${
                            isIncome ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          {isIncome ? '+' : '-'}{formatTaka(exp.amount)}
                        </div>
                        <div className="text-[10px] text-slate-500">{catName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

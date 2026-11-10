import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
  AlertTriangle,
  PieChart as PieIcon,
  Tag,
  CreditCard,
  CheckCircle2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense, Category, PaymentMethod } from '../../types';
import { formatTaka, formatDateDDMMMYY, toISODate } from '../../utils/format';
import { exportExpensesToCSV } from '../../utils/export';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

type TimeView = 'all' | 'daily' | 'weekly' | 'monthly';

export const ExpensesModule: React.FC = () => {
  const { data, addExpense, updateExpense, deleteExpense, addCategory, deleteCategory } = useApp();

  const [timeView, setTimeView] = useState<TimeView>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form state
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(toISODate());
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('Cash');
  const [formCardId, setFormCardId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  // New category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [newCatColor, setNewCatColor] = useState('#14B8A6');

  const activeCategories = useMemo(() => {
    return data.categories.filter(c => !c.deleted);
  }, [data.categories]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    activeCategories.forEach(c => map.set(c.id, c));
    return map;
  }, [activeCategories]);

  // Date filtering logic
  const now = new Date();
  const todayStr = toISODate(now);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  const startOfWeekStr = toISODate(startOfWeek);
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filteredExpenses = useMemo(() => {
    return data.expenses
      .filter(e => !e.deleted)
      .filter(e => {
        // Time filter
        if (timeView === 'daily') return e.date === todayStr;
        if (timeView === 'weekly') return e.date >= startOfWeekStr && e.date <= todayStr;
        if (timeView === 'monthly') return e.date.startsWith(currentMonthStr);
        return true;
      })
      .filter(e => {
        // Type filter
        if (selectedType !== 'all' && e.type !== selectedType) return false;
        // Category filter
        if (selectedCategoryId !== 'all' && e.categoryId !== selectedCategoryId) return false;
        // Payment method filter
        if (selectedPaymentMethod !== 'all' && e.paymentMethod !== selectedPaymentMethod) return false;
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const noteMatch = (e.note || '').toLowerCase().includes(q);
          const catMatch = (categoryMap.get(e.categoryId)?.name || '').toLowerCase().includes(q);
          const methodMatch = e.paymentMethod.toLowerCase().includes(q);
          const amountMatch = e.amount.toString().includes(q);
          return noteMatch || catMatch || methodMatch || amountMatch;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    data.expenses,
    timeView,
    selectedType,
    selectedCategoryId,
    selectedPaymentMethod,
    searchQuery,
    todayStr,
    startOfWeekStr,
    currentMonthStr,
    categoryMap
  ]);

  // Monthly Budget Progress Calculations
  const monthlyCategorySpend = useMemo(() => {
    const map = new Map<string, number>();
    data.expenses
      .filter(e => !e.deleted && e.type === 'expense' && e.date.startsWith(currentMonthStr))
      .forEach(e => {
        map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
      });
    return map;
  }, [data.expenses, currentMonthStr]);

  // Aggregate stats
  const totalFilteredExpense = filteredExpenses
    .filter(e => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0);

  const totalFilteredIncome = filteredExpenses
    .filter(e => e.type === 'income')
    .reduce((s, e) => s + e.amount, 0);

  // Category breakdown for chart
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses
      .filter(e => e.type === 'expense')
      .forEach(e => {
        map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
      });
    const items = Array.from(map.entries()).map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      return {
        id: catId,
        name: cat ? cat.name : 'Other',
        color: cat?.color || '#94A3B8',
        amount,
        percentage: totalFilteredExpense > 0 ? (amount / totalFilteredExpense) * 100 : 0,
      };
    });
    return items.sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalFilteredExpense, categoryMap]);

  const openAddModal = (type: 'expense' | 'income' = 'expense') => {
    setEditingExpense(null);
    setFormType(type);
    setFormAmount('');
    setFormDate(toISODate());
    setFormCategoryId(activeCategories[0]?.id || '');
    setFormPaymentMethod('Cash');
    setFormCardId(data.creditCards[0]?.id || '');
    setFormNote('');
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormType(exp.type);
    setFormAmount(exp.amount.toString());
    setFormDate(exp.date);
    setFormCategoryId(exp.categoryId);
    setFormPaymentMethod(exp.paymentMethod);
    setFormCardId(exp.cardId || '');
    setFormNote(exp.note || '');
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }
    if (!formCategoryId) {
      setFormError('Please select a category');
      return;
    }

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        type: formType,
        amount: amountNum,
        date: formDate,
        categoryId: formCategoryId,
        paymentMethod: formPaymentMethod,
        cardId: formPaymentMethod === 'Credit Card' ? formCardId : undefined,
        note: formNote.trim(),
      });
    } else {
      addExpense({
        type: formType,
        amount: amountNum,
        date: formDate,
        categoryId: formCategoryId,
        paymentMethod: formPaymentMethod,
        cardId: formPaymentMethod === 'Credit Card' ? formCardId : undefined,
        note: formNote.trim(),
      });
    }
    setIsExpenseModalOpen(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const budgetNum = parseFloat(newCatBudget);
    addCategory({
      name: newCatName.trim(),
      icon: 'Tag',
      color: newCatColor,
      type: 'expense',
      monthlyBudget: !isNaN(budgetNum) && budgetNum > 0 ? budgetNum : undefined,
    });
    setNewCatName('');
    setNewCatBudget('');
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
            Daily Expense Tracker
          </h2>
          <p className="text-xs text-slate-400">
            Track day-to-day spending, bKash/Nagad transactions, and category budgets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExpensesToCSV(data.expenses, activeCategories)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
            title="Export Expenses to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <Tag className="w-3.5 h-3.5 text-teal-400" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Total Spending</span>
          <div className="text-lg sm:text-xl font-extrabold text-rose-400 font-mono mt-1">
            {formatTaka(totalFilteredExpense)}
          </div>
          <span className="text-[10px] text-slate-500">
            {filteredExpenses.filter(e => e.type === 'expense').length} transactions
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Total Income</span>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono mt-1">
            {formatTaka(totalFilteredIncome)}
          </div>
          <span className="text-[10px] text-slate-500">
            {filteredExpenses.filter(e => e.type === 'income').length} entries
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Net Balance</span>
          <div className={`text-lg sm:text-xl font-extrabold font-mono mt-1 ${
            totalFilteredIncome - totalFilteredExpense >= 0 ? 'text-teal-300' : 'text-amber-400'
          }`}>
            {formatTaka(totalFilteredIncome - totalFilteredExpense)}
          </div>
          <span className="text-[10px] text-slate-500">Income minus expenses</span>
        </div>
      </div>

      {/* Monthly Budget Progress Section */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-teal-400" />
            Monthly Category Budgets
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {activeCategories
            .filter(c => c.monthlyBudget && c.monthlyBudget > 0)
            .map(cat => {
              const spent = monthlyCategorySpend.get(cat.id) || 0;
              const budget = cat.monthlyBudget!;
              const percent = Math.min(100, Math.round((spent / budget) * 100));
              const isOver100 = spent >= budget;
              const isOver80 = spent >= budget * 0.8 && !isOver100;

              return (
                <div key={cat.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                      <span className="font-semibold text-slate-200">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className={isOver100 ? 'text-red-400 font-bold' : isOver80 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {formatTaka(spent)}
                      </span>
                      <span className="text-slate-500">/ {formatTaka(budget)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full transition-all duration-300 rounded-full ${
                        isOver100
                          ? 'bg-red-500 shadow-sm shadow-red-500/50'
                          : isOver80
                          ? 'bg-amber-400'
                          : 'bg-teal-500'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{percent}% used</span>
                    {isOver100 ? (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Over budget by {formatTaka(spent - budget)}!
                      </span>
                    ) : isOver80 ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 80% budget reached
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        {formatTaka(budget - spent)} remaining
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Category Breakdown & Pie representation */}
      {categoryBreakdown.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" />
              Category Breakdown
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total {formatTaka(totalFilteredExpense)}
            </span>
          </div>

          {/* Compact multi-color stacked bar */}
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex mb-3">
            {categoryBreakdown.map(item => (
              <div
                key={item.id}
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: item.color
                }}
                className="h-full hover:opacity-80 transition cursor-pointer"
                title={`${item.name}: ${item.percentage.toFixed(1)}% (${formatTaka(item.amount)})`}
              />
            ))}
          </div>

          {/* Badges / Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            {categoryBreakdown.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}</span>
                <span className="text-slate-500 font-mono text-[11px]">{item.percentage.toFixed(0)}%</span>
                <span className="text-slate-400 font-mono text-[11px] font-semibold">{formatTaka(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Time views: Daily, Weekly, Monthly, All */}
          <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            {(['daily', 'weekly', 'monthly', 'all'] as TimeView[]).map(view => (
              <button
                key={view}
                onClick={() => setTimeView(view)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  timeView === view
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Type: All / Expense / Income */}
          <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                selectedType === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedType('expense')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                selectedType === 'expense' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setSelectedType('income')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                selectedType === 'income' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {/* Search & dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses, notes..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Categories</option>
            {activeCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Bank">Bank</option>
            <option value="Credit Card">Credit Card</option>
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
            <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No transactions found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategoryId !== 'all' || selectedPaymentMethod !== 'all'
                ? 'Try clearing your filters to see more results.'
                : 'Click "+ Add Entry" to record your first expense or income.'}
            </p>
          </div>
        ) : (
          filteredExpenses.map(expense => {
            const isIncome = expense.type === 'income';
            const cat = categoryMap.get(expense.categoryId);

            return (
              <div
                key={expense.id}
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between gap-3 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="p-2.5 rounded-xl shrink-0 text-white"
                    style={{ backgroundColor: `${cat?.color || '#0D9488'}25`, color: cat?.color || '#0D9488' }}
                  >
                    {isIncome ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4 text-rose-400" />}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                      {expense.note || cat?.name || 'Expense'}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono">{formatDateDDMMMYY(expense.date)}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {expense.paymentMethod}
                      </span>
                      {cat && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">{cat.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className={`text-xs sm:text-sm font-extrabold font-mono ${
                      isIncome ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {isIncome ? '+' : '-'}{formatTaka(expense.amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditModal(expense)}
                      className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingExpenseId(expense.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpense ? 'Edit Transaction' : 'Record Transaction'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFormType('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                formType === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setFormType('income')}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                formType === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Income (+)
            </button>
          </div>

          {/* Amount in Taka */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Amount (৳ Bangladeshi Taka) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono">৳</span>
              <input
                type="number"
                step="any"
                required
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-base font-bold font-mono text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {activeCategories
                  .filter(c => (formType === 'income' ? c.type === 'income' : c.type === 'expense'))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Payment Method *
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['Cash', 'bKash', 'Nagad', 'Bank', 'Credit Card'] as PaymentMethod[]).map(pm => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setFormPaymentMethod(pm)}
                  className={`py-1.5 px-1 rounded-lg text-xs font-semibold transition text-center truncate ${
                    formPaymentMethod === pm
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Credit Card selector if CC selected */}
          {formPaymentMethod === 'Credit Card' && data.creditCards.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Card
              </label>
              <select
                value={formCardId}
                onChange={(e) => setFormCardId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {data.creditCards.filter(c => !c.deleted).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.bank} •••• {c.last4})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Note / Description
            </label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="e.g. Lunch with team, monthly groceries, bKash recharge"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-teal-500/20 active:scale-95 transition"
            >
              {editingExpense ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Manage Categories"
        subtitle="Custom icons, colors, and monthly budgets"
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300">Add New Category</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category Name"
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
              />
              <input
                type="number"
                value={newCatBudget}
                onChange={(e) => setNewCatBudget(e.target.value)}
                placeholder="Monthly Budget (৳)"
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Color:</span>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold"
              >
                Add Category
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {activeCategories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-slate-200">{cat.name}</span>
                  {cat.monthlyBudget && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      (Budget: {formatTaka(cat.monthlyBudget)})
                    </span>
                  )}
                </div>
                {activeCategories.length > 2 && (
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1 text-slate-400 hover:text-red-400"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingExpenseId}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={() => {
          if (deletingExpenseId) deleteExpense(deletingExpenseId);
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction record? This action will sync to your Google Drive."
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  History,
  Trash2,
  Edit2,
  Calendar,
  Send,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SupplyItem, SupplyUnit } from '../../types';
import { formatDateDDMMMYY, toISODate, addMonthsToDate, getDaysDifference } from '../../utils/format';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

export const SuppliesModule: React.FC = () => {
  const { data, addSupplyItem, updateSupplyItem, deleteSupplyItem, issueSupplyItem } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'soon' | 'not_due'>('all');
  const [sortBy, setSortBy] = useState<'serNo' | 'dueDate' | 'daysLeft'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [issueItemModalTarget, setIssueItemModalTarget] = useState<SupplyItem | null>(null);
  const [issueDate, setIssueDate] = useState(toISODate());
  const [issueQty, setIssueQty] = useState('1');
  const [issueRemarks, setIssueRemarks] = useState('');

  const [historyItemTarget, setHistoryItemTarget] = useState<SupplyItem | null>(null);

  // Form state for add/edit item
  const [serNoInput, setSerNoInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [cycleInput, setCycleInput] = useState('6');
  const [lastDateInput, setLastDateInput] = useState(toISODate());
  const [maxQtyInput, setMaxQtyInput] = useState('1');
  const [unitInput, setUnitInput] = useState<SupplyUnit>('Ea');
  const [remarksInput, setRemarksInput] = useState('');
  const [formError, setFormError] = useState('');

  const todayStr = toISODate();
  const warningDays = data.settings?.defaultDueWarningDays || 30;

  // Compute table data with exact mathematical formulas
  const processedItems = useMemo(() => {
    return data.supplyItems
      .filter(item => !item.deleted)
      .map(item => {
        // Next Due Date = Last Issue Date + Issue Cycle (months)
        const nextDueDate = addMonthsToDate(item.lastIssueDate, item.cycleMonths);

        // Days calculation
        // diffDays = Next Due Date - Today
        const diffDays = getDaysDifference(nextDueDate, todayStr);

        // Days Left = Next Due Date - Today (min 0)
        const daysLeft = Math.max(0, diffDays);

        // Days Over = Today - Next Due Date (min 0)
        const daysOver = Math.max(0, -diffDays);

        // Status logic:
        // "Item Due" (green) when today >= Next Due Date (diffDays <= 0)
        // "Due Soon" (blue) when due date is within 30 days (0 < diffDays <= warningDays)
        // "Not Due" (red) otherwise (diffDays > warningDays)
        let status: 'Item Due' | 'Due Soon' | 'Not Due' = 'Not Due';
        if (diffDays <= 0) {
          status = 'Item Due';
        } else if (diffDays <= warningDays) {
          status = 'Due Soon';
        } else {
          status = 'Not Due';
        }

        // Today's Max Issuable Qty = Max Issuable Qty if item is due, otherwise 0
        const todayMaxIssuableQty = status === 'Item Due' ? item.maxQty : 0;

        return {
          ...item,
          nextDueDate,
          daysLeft,
          daysOver,
          todayMaxIssuableQty,
          status,
          rawDiffDays: diffDays,
        };
      });
  }, [data.supplyItems, todayStr, warningDays]);

  // Aggregate counts for summary banner
  const counts = useMemo(() => {
    let due = 0;
    let soon = 0;
    let notDue = 0;
    processedItems.forEach(i => {
      if (i.status === 'Item Due') due++;
      else if (i.status === 'Due Soon') soon++;
      else notDue++;
    });
    return { due, soon, notDue, total: processedItems.length };
  }, [processedItems]);

  // Filtered and sorted
  const displayItems = useMemo(() => {
    return processedItems
      .filter(item => {
        if (statusFilter === 'due' && item.status !== 'Item Due') return false;
        if (statusFilter === 'soon' && item.status !== 'Due Soon') return false;
        if (statusFilter === 'not_due' && item.status !== 'Not Due') return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchSer = item.serNo.toString().includes(q);
          const matchRemarks = (item.remarks || '').toLowerCase().includes(q);
          return matchName || matchSer || matchRemarks;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'serNo') {
          cmp = a.serNo - b.serNo;
        } else if (sortBy === 'dueDate') {
          cmp = new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
        } else if (sortBy === 'daysLeft') {
          cmp = a.rawDiffDays - b.rawDiffDays;
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [processedItems, statusFilter, searchQuery, sortBy, sortDirection]);

  // Item history records
  const currentItemHistory = useMemo(() => {
    if (!historyItemTarget) return [];
    return data.supplyHistory
      .filter(h => !h.deleted && h.itemId === historyItemTarget.id)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [data.supplyHistory, historyItemTarget]);

  // Handlers
  const openAddItemModal = () => {
    setEditingItem(null);
    const maxSer = data.supplyItems.reduce((m, i) => (!i.deleted && i.serNo > m ? i.serNo : m), 0);
    setSerNoInput((maxSer + 1).toString());
    setNameInput('');
    setCycleInput('6');
    setLastDateInput(todayStr);
    setMaxQtyInput('1');
    setUnitInput('Ea');
    setRemarksInput('');
    setFormError('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: SupplyItem) => {
    setEditingItem(item);
    setSerNoInput(item.serNo.toString());
    setNameInput(item.name);
    setCycleInput(item.cycleMonths.toString());
    setLastDateInput(item.lastIssueDate);
    setMaxQtyInput(item.maxQty.toString());
    setUnitInput(item.unit);
    setRemarksInput(item.remarks || '');
    setFormError('');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setFormError('Please enter an item name');
      return;
    }
    const cycle = parseInt(cycleInput, 10);
    const maxQty = parseInt(maxQtyInput, 10);
    const ser = parseInt(serNoInput, 10) || 1;

    if (isNaN(cycle) || cycle <= 0) {
      setFormError('Issue cycle must be at least 1 month');
      return;
    }

    if (editingItem) {
      updateSupplyItem(editingItem.id, {
        serNo: ser,
        name: nameInput.trim(),
        cycleMonths: cycle,
        lastIssueDate: lastDateInput,
        maxQty: maxQty || 1,
        unit: unitInput,
        remarks: remarksInput.trim() || undefined,
      });
    } else {
      addSupplyItem({
        serNo: ser,
        name: nameInput.trim(),
        cycleMonths: cycle,
        lastIssueDate: lastDateInput,
        maxQty: maxQty || 1,
        unit: unitInput,
        remarks: remarksInput.trim() || undefined,
      });
    }
    setIsItemModalOpen(false);
  };

  const openIssueModal = (item: SupplyItem) => {
    setIssueItemModalTarget(item);
    setIssueDate(todayStr);
    setIssueQty(item.maxQty.toString());
    setIssueRemarks(`Issued official periodic entitlement`);
  };

  const handleConfirmIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueItemModalTarget) return;
    const qty = parseInt(issueQty, 10) || 1;
    issueSupplyItem(issueItemModalTarget.id, issueDate, qty, issueRemarks.trim() || undefined);
    setIssueItemModalTarget(null);
  };

  const toggleSort = (field: 'serNo' | 'dueDate' | 'daysLeft') => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-emerald-400" />
            Supply Items Tracker
          </h2>
          <p className="text-xs text-slate-400">
            Official periodic entitlement manager with auto-due dates and issuance history
          </p>
        </div>

        <button
          onClick={openAddItemModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Supply Item</span>
        </button>
      </div>

      {/* Summary KPI Cards: Item Due, Due Soon, Not Due */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'all' ? 'bg-slate-800 border-teal-500/50' : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <span className="text-xs text-slate-400">Total Items</span>
          <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
            {counts.total}
          </div>
          <span className="text-[10px] text-slate-500">All registered items</span>
        </div>

        {/* Item Due (green) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'due' ? 'all' : 'due')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'due' ? 'bg-emerald-950/60 border-emerald-500' : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold">Item Due</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-300 mt-0.5">
            {counts.due}
          </div>
          <span className="text-[10px] text-emerald-400/80">Ready to issue now</span>
        </div>

        {/* Due Soon (blue) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'soon' ? 'all' : 'soon')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'soon' ? 'bg-sky-950/60 border-sky-500' : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-400 font-semibold">Due Soon</span>
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          </div>
          <div className="text-xl font-extrabold font-mono text-sky-300 mt-0.5">
            {counts.soon}
          </div>
          <span className="text-[10px] text-sky-400/80">Within {warningDays} days</span>
        </div>

        {/* Not Due (red) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'not_due' ? 'all' : 'not_due')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'not_due' ? 'bg-rose-950/60 border-rose-500' : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-semibold">Not Due</span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-xl font-extrabold font-mono text-rose-300 mt-0.5">
            {counts.notDue}
          </div>
          <span className="text-[10px] text-rose-400/80">Active cycle</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, remarks..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 shrink-0">Sort by:</span>
          <button
            onClick={() => toggleSort('dueDate')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
              sortBy === 'dueDate' ? 'bg-slate-800 text-teal-300 border-teal-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <span>Next Due</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleSort('serNo')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
              sortBy === 'serNo' ? 'bg-slate-800 text-teal-300 border-teal-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <span>Ser No</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button
            onClick={() => toggleSort('daysLeft')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition ${
              sortBy === 'daysLeft' ? 'bg-slate-800 text-teal-300 border-teal-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <span>Days Remaining</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Responsive Supply Table (Desktop & Mobile optimized cards) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-12 text-center">Ser</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-3 text-center">Cycle</th>
                <th className="py-3 px-3">Last Issue</th>
                <th className="py-3 px-3 text-center">Max Qty</th>
                <th className="py-3 px-3">Next Due</th>
                <th className="py-3 px-3 text-center">Days Left</th>
                <th className="py-3 px-3 text-center">Days Over</th>
                <th className="py-3 px-3 text-center">Today's Qty</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No supply items match your search or filter.
                  </td>
                </tr>
              ) : (
                displayItems.map(item => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Ser No */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                        {item.serNo}
                      </td>

                      {/* Item Name & remarks */}
                      <td className="py-3.5 px-4 font-medium text-slate-100">
                        <div className="font-semibold">{item.name}</div>
                        {item.remarks && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                            {item.remarks}
                          </div>
                        )}
                      </td>

                      {/* Cycle */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                        {item.cycleMonths} mo
                      </td>

                      {/* Last Issue Date */}
                      <td className="py-3.5 px-3 font-mono text-slate-300">
                        {formatDateDDMMMYY(item.lastIssueDate)}
                      </td>

                      {/* Max Issuable Qty & Unit */}
                      <td className="py-3.5 px-3 text-center font-mono font-semibold text-slate-200">
                        {item.maxQty} {item.unit}
                      </td>

                      {/* Next Due Date */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-100">
                        {formatDateDDMMMYY(item.nextDueDate)}
                      </td>

                      {/* Days Left */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        {item.daysLeft > 0 ? (
                          <span className="text-slate-300">{item.daysLeft}</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>

                      {/* Days Over */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        {item.daysOver > 0 ? (
                          <span className="text-emerald-400 font-bold">+{item.daysOver}</span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>

                      {/* Today's Max Issuable Qty */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold">
                        {item.todayMaxIssuableQty > 0 ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {item.todayMaxIssuableQty} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      {/* Item Due (green), Due Soon (blue), Not Due (red) */}
                      <td className="py-3.5 px-3 text-center">
                        {item.status === 'Item Due' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Item Due
                          </span>
                        )}
                        {item.status === 'Due Soon' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                            Due Soon
                          </span>
                        )}
                        {item.status === 'Not Due' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Not Due
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Issue Button */}
                          <button
                            onClick={() => openIssueModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-semibold border border-teal-500/30 text-[11px] transition flex items-center gap-1"
                            title="Issue this item now"
                          >
                            <Send className="w-3 h-3" />
                            <span>Issue</span>
                          </button>

                          {/* History */}
                          <button
                            onClick={() => setHistoryItemTarget(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                            title="View Issue History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditItemModal(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeletingItemId(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supply Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Supply Item' : 'Add Supply Item'}
        subtitle="Configure entitlement cycle and maximum issuable quantity"
        maxWidth="md"
      >
        <form onSubmit={handleSaveItem} className="space-y-3">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Ser No *</label>
              <input
                type="number"
                required
                value={serNoInput}
                onChange={(e) => setSerNoInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Shoes BL, Socks Nylon BL, Towel Hand"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Issue Cycle (Months) *</label>
              <input
                type="number"
                required
                min={1}
                value={cycleInput}
                onChange={(e) => setCycleInput(e.target.value)}
                placeholder="e.g. 6, 9, 48"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Last Issue Date *</label>
              <input
                type="date"
                required
                value={lastDateInput}
                onChange={(e) => setLastDateInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Issuable Qty *</label>
              <input
                type="number"
                required
                min={1}
                value={maxQtyInput}
                onChange={(e) => setMaxQtyInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Unit *</label>
              <select
                value={unitInput}
                onChange={(e) => setUnitInput(e.target.value as SupplyUnit)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              >
                <option value="Ea">Ea (Each)</option>
                <option value="Pair">Pair</option>
                <option value="Set">Set</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Remarks</label>
            <input
              type="text"
              value={remarksInput}
              onChange={(e) => setRemarksInput(e.target.value)}
              placeholder="e.g. Black nylon official issue"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              {editingItem ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Issue Item Action Modal */}
      <Modal
        isOpen={!!issueItemModalTarget}
        onClose={() => setIssueItemModalTarget(null)}
        title="Issue Item"
        subtitle={`Item: ${issueItemModalTarget?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmIssue} className="space-y-3">
          <p className="text-xs text-slate-300">
            Issuing this item will update the <strong>Last Issue Date</strong> to the selected date and calculate the next due date forward by {issueItemModalTarget?.cycleMonths} months.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Issued Quantity ({issueItemModalTarget?.unit}) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={issueQty}
                onChange={(e) => setIssueQty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Issue Remarks / Reference</label>
            <input
              type="text"
              value={issueRemarks}
              onChange={(e) => setIssueRemarks(e.target.value)}
              placeholder="e.g. Periodic replacement issued"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIssueItemModalTarget(null)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Confirm Issue
            </button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={!!historyItemTarget}
        onClose={() => setHistoryItemTarget(null)}
        title="Issue History"
        subtitle={`Item: ${historyItemTarget?.name}`}
        maxWidth="md"
      >
        <div className="space-y-3">
          {currentItemHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No historical issues recorded yet. The initial issue date was {historyItemTarget ? formatDateDDMMMYY(historyItemTarget.lastIssueDate) : '—'}.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentItemHistory.map(h => (
                <div
                  key={h.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">
                      {formatDateDDMMMYY(h.issueDate)}
                    </div>
                    {h.remarks && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{h.remarks}</div>
                    )}
                  </div>
                  <div className="font-mono font-bold text-emerald-400">
                    +{h.qty} {historyItemTarget?.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Item Confirmation */}
      <ConfirmModal
        isOpen={!!deletingItemId}
        onClose={() => setDeletingItemId(null)}
        onConfirm={() => {
          if (deletingItemId) deleteSupplyItem(deletingItemId);
        }}
        title="Delete Supply Item"
        message="Are you sure you want to delete this supply item and its calculation cycle?"
      />
    </div>
  );
};

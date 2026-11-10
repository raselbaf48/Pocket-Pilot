import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { formatTaka, toISODate } from '../../utils/format';
import { PaymentMethod } from '../../types';

export const GlobalQuickAddModals: React.FC = () => {
  const { quickAddType, setQuickAddType, data, addExpense, addFuelLog, addCardTransaction } = useApp();

  // Quick Expense
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState(data.categories[0]?.id || 'cat-food');
  const [expPayment, setExpPayment] = useState<PaymentMethod>('Cash');
  const [expCardId, setExpCardId] = useState(data.creditCards[0]?.id || '');
  const [expNote, setExpNote] = useState('');
  const [expType, setExpType] = useState<'expense' | 'income'>('expense');

  // Quick Fuel
  const targetVeh = data.vehicles[0];
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelPrice, setFuelPrice] = useState('130');
  const [fuelOdo, setFuelOdo] = useState(targetVeh ? targetVeh.currentOdo.toString() : '');
  const [fuelNotes, setFuelNotes] = useState('');

  // Quick Card Spend
  const targetCard = data.creditCards[0];
  const [cardSelectedId, setCardSelectedId] = useState(targetCard ? targetCard.id : '');
  const [cardMerchant, setCardMerchant] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardNote, setCardNote] = useState('');

  if (!quickAddType) return null;

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    addExpense({
      type: expType,
      amount: amt,
      date: toISODate(),
      categoryId: expCategory,
      paymentMethod: expPayment,
      cardId: expPayment === 'Credit Card' ? expCardId : undefined,
      note: expNote.trim() || undefined,
    });
    setExpAmount('');
    setExpNote('');
    setQuickAddType(null);
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVeh) return;
    const ltr = parseFloat(fuelLiters);
    const prc = parseFloat(fuelPrice);
    const odo = parseInt(fuelOdo, 10);
    if (isNaN(ltr) || isNaN(odo)) return;
    addFuelLog({
      vehicleId: targetVeh.id,
      date: toISODate(),
      odometer: odo,
      liters: ltr,
      pricePerLiter: prc,
      totalCost: Math.round(ltr * prc),
      isFullTank: true,
      notes: fuelNotes.trim() || undefined,
    });
    setFuelLiters('');
    setFuelNotes('');
    setQuickAddType(null);
  };

  const handleCardSpendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(cardAmount);
    if (isNaN(amt) || !cardSelectedId) return;
    addCardTransaction({
      cardId: cardSelectedId,
      date: toISODate(),
      merchant: cardMerchant.trim(),
      amount: amt,
      category: 'General Spend',
      note: cardNote.trim() || undefined,
    });
    setCardMerchant('');
    setCardAmount('');
    setCardNote('');
    setQuickAddType(null);
  };

  return (
    <>
      {/* Quick Expense */}
      <Modal
        isOpen={quickAddType === 'expense'}
        onClose={() => setQuickAddType(null)}
        title="Quick Add Expense"
        maxWidth="sm"
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg">
            <button
              type="button"
              onClick={() => setExpType('expense')}
              className={`py-1.5 text-xs font-bold rounded ${
                expType === 'expense' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'
              }`}
            >
              Expense (-)
            </button>
            <button
              type="button"
              onClick={() => setExpType('income')}
              className={`py-1.5 text-xs font-bold rounded ${
                expType === 'income' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
              }`}
            >
              Income (+)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Amount (৳) *</label>
            <input
              type="number"
              step="any"
              autoFocus
              required
              placeholder="0.00"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold font-mono text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                {data.categories
                  .filter(c => !c.deleted && (expType === 'income' ? c.type === 'income' : c.type === 'expense'))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Method</label>
              <select
                value={expPayment}
                onChange={(e) => setExpPayment(e.target.value as PaymentMethod)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                <option value="Cash">Cash</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank">Bank</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Lunch with friends"
              value={expNote}
              onChange={(e) => setExpNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setQuickAddType(null)}
              className="px-3 py-1.5 text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Save Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Fuel */}
      <Modal
        isOpen={quickAddType === 'fuel'}
        onClose={() => setQuickAddType(null)}
        title="Quick Fuel Fill-up"
        subtitle={targetVeh ? targetVeh.name : 'No vehicle registered'}
        maxWidth="sm"
      >
        <form onSubmit={handleFuelSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Liters *</label>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="e.g. 9.5"
                value={fuelLiters}
                onChange={(e) => setFuelLiters(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold font-mono text-cyan-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Price / L (৳)</label>
              <input
                type="number"
                step="any"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Odometer (km) *</label>
            <input
              type="number"
              required
              value={fuelOdo}
              onChange={(e) => setFuelOdo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Station Note</label>
            <input
              type="text"
              placeholder="e.g. Meghna Petrol Pump"
              value={fuelNotes}
              onChange={(e) => setFuelNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setQuickAddType(null)}
              className="px-3 py-1.5 text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Save Fill-up
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Card Spend */}
      <Modal
        isOpen={quickAddType === 'card_spend'}
        onClose={() => setQuickAddType(null)}
        title="Quick Card Spend"
        maxWidth="sm"
      >
        <form onSubmit={handleCardSpendSubmit} className="space-y-3">
          {data.creditCards.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Select Card</label>
              <select
                value={cardSelectedId}
                onChange={(e) => setCardSelectedId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
              >
                {data.creditCards.filter(c => !c.deleted).map(c => (
                  <option key={c.id} value={c.id}>{c.name} (•••• {c.last4})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Merchant / Store *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Shwapno, Daraz, Pathao"
              value={cardMerchant}
              onChange={(e) => setCardMerchant(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Amount (৳) *</label>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={cardAmount}
              onChange={(e) => setCardAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold font-mono text-indigo-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Groceries"
              value={cardNote}
              onChange={(e) => setCardNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setQuickAddType(null)}
              className="px-3 py-1.5 text-xs text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-xs"
            >
              Record Spend
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

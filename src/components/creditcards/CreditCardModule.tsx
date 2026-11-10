import React, { useState, useMemo } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  ChevronRight,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CreditCard, CardTransaction, CardPayment } from '../../types';
import { formatTaka, formatDateDDMMMYY, toISODate, getDaysDifference } from '../../utils/format';
import { exportCardStatementToCSV } from '../../utils/export';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';

interface StatementCycle {
  periodTitle: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  openingBalance: number;
  newSpend: number;
  paymentsMade: number;
  totalDue: number;
  minimumDue: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  transactions: CardTransaction[];
}

export const CreditCardModule: React.FC = () => {
  const {
    data,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addCardTransaction,
    deleteCardTransaction,
    addCardPayment,
    deleteCardPayment
  } = useApp();

  const activeCards = useMemo(() => {
    return data.creditCards.filter(c => !c.deleted);
  }, [data.creditCards]);

  const [selectedCardId, setSelectedCardId] = useState<string>(() => {
    return activeCards[0]?.id || '';
  });

  const currentCard = useMemo(() => {
    return activeCards.find(c => c.id === selectedCardId) || activeCards[0] || null;
  }, [activeCards, selectedCardId]);

  // Tab: 'overview' | 'statements' | 'transactions' | 'payments'
  const [activeTab, setActiveTab] = useState<'overview' | 'statements' | 'transactions' | 'payments'>('overview');

  // Modals state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // New Card Form
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardStatementDay, setCardStatementDay] = useState('15');
  const [cardPaymentDueDays, setCardPaymentDueDays] = useState('20');
  const [cardColor, setCardColor] = useState('#0284C7');

  // Transaction Form
  const [txDate, setTxDate] = useState(toISODate());
  const [txMerchant, setTxMerchant] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Shopping');
  const [txEmiMonths, setTxEmiMonths] = useState('');
  const [txNote, setTxNote] = useState('');

  // Payment Form
  const [pmtDate, setPmtDate] = useState(toISODate());
  const [pmtAmount, setPmtAmount] = useState('');
  const [pmtRef, setPmtRef] = useState('');
  const [pmtNote, setPmtNote] = useState('');

  const now = new Date();
  const todayStr = toISODate(now);

  // Filter transactions and payments for the selected card
  const cardTransactions = useMemo(() => {
    if (!currentCard) return [];
    return data.cardTransactions
      .filter(t => !t.deleted && t.cardId === currentCard.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.cardTransactions, currentCard]);

  const cardPayments = useMemo(() => {
    if (!currentCard) return [];
    return data.cardPayments
      .filter(p => !p.deleted && p.cardId === currentCard.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.cardPayments, currentCard]);

  // Overall Financials for Selected Card
  const totalSpend = cardTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = cardPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = Math.max(0, totalSpend - totalPaid);
  const creditLimit = currentCard ? currentCard.creditLimit : 0;
  const availableLimit = Math.max(0, creditLimit - outstandingBalance);
  const utilizationPercent = creditLimit > 0 ? (outstandingBalance / creditLimit) * 100 : 0;

  // Auto-Group Monthly Statements
  // Generates statement cycles for past 6 months based on statementDay
  const statements: StatementCycle[] = useMemo(() => {
    if (!currentCard) return [];
    const stmtDay = currentCard.statementDay || 15;
    const dueDays = currentCard.paymentDueDays || 20;
    const list: StatementCycle[] = [];

    for (let i = 0; i < 6; i++) {
      // Statement end date for month (now.getMonth() - i)
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, stmtDay);
      const endDate = toISODate(targetMonthDate);

      // Start date: stmtDay + 1 of preceding month
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - i - 1, stmtDay + 1);
      const startDate = toISODate(prevMonthDate);

      // Due date
      const dueDateObj = new Date(targetMonthDate.getTime() + dueDays * 24 * 60 * 60 * 1000);
      const dueDate = toISODate(dueDateObj);

      const periodTitle = targetMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' }) + ' Statement';

      // Transactions in this window
      const cycleTxs = cardTransactions.filter(t => t.date >= startDate && t.date <= endDate);
      const cycleSpend = cycleTxs.reduce((sum, t) => sum + t.amount, 0);

      // Payments in cycle window (up to due date)
      const cyclePmts = cardPayments.filter(p => p.date >= startDate && p.date <= dueDate);
      const cyclePaid = cyclePmts.reduce((sum, p) => sum + p.amount, 0);

      const totalDue = Math.max(0, cycleSpend - cyclePaid);
      const minimumDue = Math.max(500, Math.round(totalDue * 0.05)); // 5% minimum or ৳500

      let status: 'Paid' | 'Unpaid' | 'Overdue' = 'Unpaid';
      if (totalDue <= 0 && cycleSpend > 0) {
        status = 'Paid';
      } else if (todayStr > dueDate && totalDue > 0) {
        status = 'Overdue';
      }

      list.push({
        periodTitle,
        startDate,
        endDate,
        dueDate,
        openingBalance: 0,
        newSpend: cycleSpend,
        paymentsMade: cyclePaid,
        totalDue,
        minimumDue: totalDue > 0 ? minimumDue : 0,
        status,
        transactions: cycleTxs,
      });
    }

    return list;
  }, [currentCard, cardTransactions, cardPayments, now, todayStr]);

  const [selectedStatementIndex, setSelectedStatementIndex] = useState<number>(0);
  const currentStatement = statements[selectedStatementIndex] || statements[0] || null;

  // Due Date alert for current statement
  const daysUntilDue = currentStatement ? getDaysDifference(currentStatement.dueDate, todayStr) : null;
  const isDueWithin5Days = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 5 && currentStatement?.status !== 'Paid';

  // Handlers
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(cardLimit);
    const sDay = parseInt(cardStatementDay, 10) || 15;
    const dueD = parseInt(cardPaymentDueDays, 10) || 20;

    addCreditCard({
      name: cardName.trim(),
      bank: cardBank.trim(),
      last4: cardLast4.trim(),
      creditLimit: limitNum,
      statementDay: sDay,
      paymentDueDays: dueD,
      color: cardColor,
    });
    setIsCardModalOpen(false);
    setCardName('');
    setCardBank('');
    setCardLast4('');
    setCardLimit('');
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard) return;
    const amountNum = parseFloat(txAmount);
    const emiNum = txEmiMonths ? parseInt(txEmiMonths, 10) : undefined;

    addCardTransaction({
      cardId: currentCard.id,
      date: txDate,
      merchant: txMerchant.trim(),
      amount: amountNum,
      category: txCategory,
      emiMonths: emiNum,
      note: txNote.trim() || undefined,
    });
    setIsTxModalOpen(false);
    setTxMerchant('');
    setTxAmount('');
    setTxNote('');
    setTxEmiMonths('');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard) return;
    const amountNum = parseFloat(pmtAmount);

    addCardPayment({
      cardId: currentCard.id,
      date: pmtDate,
      amount: amountNum,
      reference: pmtRef.trim() || undefined,
      note: pmtNote.trim() || undefined,
    });
    setIsPaymentModalOpen(false);
    setPmtAmount('');
    setPmtRef('');
    setPmtNote('');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header and Card Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <CardIcon className="w-6 h-6 text-indigo-400" />
            Credit Card Manager
          </h2>
          <p className="text-xs text-slate-400">
            Monitor limits, billing statements, utilization and upcoming payment due dates
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCards.length > 1 && (
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200"
            >
              {activeCards.map(c => (
                <option key={c.id} value={c.id}>{c.name} (•••• {c.last4})</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsCardModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            + New Card
          </button>

          <button
            onClick={() => {
              setPmtAmount(outstandingBalance > 0 ? outstandingBalance.toString() : '');
              setIsPaymentModalOpen(true);
            }}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
          >
            + Record Payment
          </button>

          <button
            onClick={() => setIsTxModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition"
          >
            + Spend
          </button>
        </div>
      </div>

      {/* Due Date Alert Banner (< 5 days) */}
      {isDueWithin5Days && currentStatement && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">
                Payment Due Soon: {daysUntilDue} day{daysUntilDue === 1 ? '' : 's'} left!
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Total due of <span className="font-bold font-mono">{formatTaka(currentStatement.totalDue)}</span> for {currentCard?.name} is due on {formatDateDDMMMYY(currentStatement.dueDate)}.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPmtAmount(currentStatement.totalDue.toString());
              setIsPaymentModalOpen(true);
            }}
            className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs shrink-0 hover:bg-amber-400 transition"
          >
            Pay ৳{currentStatement.totalDue.toLocaleString()}
          </button>
        </div>
      )}

      {/* Credit Card Digital Card Graphic */}
      {currentCard && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 shadow-2xl text-white transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${currentCard.color || '#0284C7'}, #0F172A 90%)`
          }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-white/80" />
              <span className="font-bold tracking-wider text-xs uppercase text-white/90">
                {currentCard.bank}
              </span>
            </div>
            <div className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs font-mono text-[10px] tracking-widest font-semibold">
              VISA / MC
            </div>
          </div>

          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-xs text-white/70">Card Name</div>
              <div className="text-lg sm:text-xl font-bold tracking-tight">{currentCard.name}</div>
            </div>
            <div className="font-mono text-base tracking-widest text-white/90">
              •••• •••• •••• {currentCard.last4}
            </div>
          </div>

          {/* Limit and Utilization Bar */}
          <div className="space-y-2 pt-2 border-t border-white/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80">Available Limit: <strong className="font-mono">{formatTaka(availableLimit)}</strong></span>
              <span className="text-white/90 font-mono">Limit: {formatTaka(creditLimit)}</span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-black/30 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  utilizationPercent > 70
                    ? 'bg-rose-400'
                    : utilizationPercent > 30
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/70">
              <span>Outstanding: <strong className="font-mono text-white">{formatTaka(outstandingBalance)}</strong></span>
              <span>
                Utilization: <strong className={`font-mono ${utilizationPercent > 70 ? 'text-rose-300 font-bold' : ''}`}>{utilizationPercent.toFixed(1)}%</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'overview'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Statement Breakdown
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'transactions'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Transactions ({cardTransactions.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'payments'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Payments Logged ({cardPayments.length})
        </button>
      </div>

      {/* Tab 1: STATEMENT BREAKDOWN */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Statement Month Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {statements.map((stmt, idx) => (
              <button
                key={stmt.periodTitle}
                onClick={() => setSelectedStatementIndex(idx)}
                className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 flex items-center gap-2 transition ${
                  selectedStatementIndex === idx
                    ? 'bg-indigo-600 text-white font-bold shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{stmt.periodTitle}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  stmt.status === 'Paid'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : stmt.status === 'Overdue'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {stmt.status}
                </span>
              </button>
            ))}
          </div>

          {currentStatement && currentCard && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">{currentStatement.periodTitle}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      currentStatement.status === 'Paid'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : currentStatement.status === 'Overdue'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {currentStatement.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Billing Cycle: {formatDateDDMMMYY(currentStatement.startDate)} to {formatDateDDMMMYY(currentStatement.endDate)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportCardStatementToCSV(
                      currentCard,
                      currentStatement.periodTitle,
                      currentStatement.transactions,
                      currentStatement.newSpend,
                      currentStatement.openingBalance
                    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>
                </div>
              </div>

              {/* Statement Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Total New Spend</span>
                  <div className="text-base font-bold text-slate-100 font-mono mt-0.5">
                    {formatTaka(currentStatement.newSpend)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Payments Made</span>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {formatTaka(currentStatement.paymentsMade)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Total Due</span>
                  <div className={`text-base font-bold font-mono mt-0.5 ${
                    currentStatement.totalDue > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {formatTaka(currentStatement.totalDue)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Payment Due Date</span>
                  <div className="text-xs font-bold text-amber-300 font-mono mt-1">
                    {formatDateDDMMMYY(currentStatement.dueDate)}
                  </div>
                </div>
              </div>

              {/* Statement Transactions Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Statement Transactions ({currentStatement.transactions.length})
                </div>
                {currentStatement.transactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950 border border-slate-800">
                    No transactions recorded during this statement cycle.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {currentStatement.transactions.map(t => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-mono">{formatDateDDMMMYY(t.date)}</span>
                          <span className="font-semibold text-slate-200">{t.merchant}</span>
                          {t.emiMonths && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                              {t.emiMonths} mos EMI
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-100 font-mono">
                          {formatTaka(t.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: ALL TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-2">
          {cardTransactions.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-500">
              No transactions logged for this card. Tap "+ Spend" above to log a charge.
            </div>
          ) : (
            cardTransactions.map(t => (
              <div
                key={t.id}
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                    <CardIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-100">
                      {t.merchant}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono">{formatDateDDMMMYY(t.date)}</span>
                      <span>•</span>
                      <span>{t.category}</span>
                      {t.emiMonths && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400">{t.emiMonths} Months EMI</span>
                        </>
                      )}
                      {t.note && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-300">{t.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-sm font-bold text-slate-100 font-mono">
                    {formatTaka(t.amount)}
                  </div>
                  <button
                    onClick={() => setDeletingTxId(t.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: PAYMENTS LOGGED */}
      {activeTab === 'payments' && (
        <div className="space-y-2">
          {cardPayments.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-500">
              No payments recorded yet. Tap "+ Record Payment" to log a settlement.
            </div>
          ) : (
            cardPayments.map(p => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-semibold text-emerald-300">
                      Payment Recorded: {formatTaka(p.amount)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono">{formatDateDDMMMYY(p.date)}</span>
                      {p.reference && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-300">Ref: {p.reference}</span>
                        </>
                      )}
                      {p.note && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-400">{p.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setDeletingPaymentId(p.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Card Modal */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title="Add Credit Card"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCard} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Card Name *</label>
            <input
              type="text"
              required
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="e.g. Simply Cash Platinum"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Issuing Bank *</label>
              <input
                type="text"
                required
                value={cardBank}
                onChange={(e) => setCardBank(e.target.value)}
                placeholder="e.g. SCB, City Bank, BRAC"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Last 4 Digits *</label>
              <input
                type="text"
                required
                maxLength={4}
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value)}
                placeholder="4821"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Credit Limit (৳) *</label>
            <input
              type="number"
              required
              value={cardLimit}
              onChange={(e) => setCardLimit(e.target.value)}
              placeholder="150000"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Statement Day (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={cardStatementDay}
                onChange={(e) => setCardStatementDay(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Payment Due (Days after stmt)</label>
              <input
                type="number"
                min={1}
                max={45}
                value={cardPaymentDueDays}
                onChange={(e) => setCardPaymentDueDays(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400">Card Color Accent:</span>
            <input
              type="color"
              value={cardColor}
              onChange={(e) => setCardColor(e.target.value)}
              className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-xs"
            >
              Save Card
            </button>
          </div>
        </form>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Record Card Transaction"
        subtitle={`Card: ${currentCard?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveTx} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Merchant / Store *</label>
            <input
              type="text"
              required
              value={txMerchant}
              onChange={(e) => setTxMerchant(e.target.value)}
              placeholder="e.g. Shwapno Supermarket, Daraz, Star Cineplex"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Amount (৳) *</label>
              <input
                type="number"
                step="any"
                required
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              >
                <option value="Food & Dining">Food & Dining</option>
                <option value="Shopping">Shopping</option>
                <option value="Electronics">Electronics</option>
                <option value="Travel & Hotel">Travel & Hotel</option>
                <option value="Groceries">Groceries</option>
                <option value="Bills & Utilities">Bills & Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">EMI Tenure (Optional)</label>
              <input
                type="number"
                value={txEmiMonths}
                onChange={(e) => setTxEmiMonths(e.target.value)}
                placeholder="e.g. 6 (months)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Note</label>
            <input
              type="text"
              value={txNote}
              onChange={(e) => setTxNote(e.target.value)}
              placeholder="e.g. Grocery purchase"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTxModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
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

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Card Bill Payment"
        subtitle={`Card: ${currentCard?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSavePayment} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Payment Amount (৳) *</label>
              <input
                type="number"
                step="any"
                required
                value={pmtAmount}
                onChange={(e) => setPmtAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={pmtDate}
                onChange={(e) => setPmtDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Bank Reference / Tx ID</label>
            <input
              type="text"
              value={pmtRef}
              onChange={(e) => setPmtRef(e.target.value)}
              placeholder="e.g. BEFTN-102938 / bKash Pay"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
            <input
              type="text"
              value={pmtNote}
              onChange={(e) => setPmtNote(e.target.value)}
              placeholder="e.g. Cleared via online banking"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modals */}
      <ConfirmModal
        isOpen={!!deletingTxId}
        onClose={() => setDeletingTxId(null)}
        onConfirm={() => {
          if (deletingTxId) deleteCardTransaction(deletingTxId);
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this card transaction?"
      />

      <ConfirmModal
        isOpen={!!deletingPaymentId}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={() => {
          if (deletingPaymentId) deleteCardPayment(deletingPaymentId);
        }}
        title="Delete Payment"
        message="Are you sure you want to remove this recorded payment?"
      />
    </div>
  );
};

/**
 * Export and Import utilities for Pocket Pilot
 * Supports CSV export for expenses and card statements, and JSON backup file handling.
 */

import { AppData, Expense, Category, CardTransaction, CreditCard } from '../types';
import { formatDateDDMMMYY } from './format';

export function downloadFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export expenses list to CSV
 */
export function exportExpensesToCSV(expenses: Expense[], categories: Category[]) {
  const catMap = new Map<string, string>();
  categories.forEach(c => catMap.set(c.id, c.name));

  const headers = ['Date', 'Formatted Date', 'Type', 'Amount (BDT)', 'Category', 'Payment Method', 'Note'];
  const rows = expenses
    .filter(e => !e.deleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(e => [
      e.date,
      formatDateDDMMMYY(e.date),
      e.type.toUpperCase(),
      e.amount.toString(),
      `"${(catMap.get(e.categoryId) || 'Other').replace(/"/g, '""')}"`,
      e.paymentMethod,
      `"${(e.note || '').replace(/"/g, '""')}"`,
    ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `PocketPilot-Expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Export credit card statement to CSV
 */
export function exportCardStatementToCSV(
  card: CreditCard,
  periodTitle: string,
  transactions: CardTransaction[],
  totalSpend: number,
  openingBalance: number
) {
  const headers = ['Date', 'Merchant', 'Category', 'Amount (BDT)', 'EMI Months', 'Note'];
  const rows = transactions
    .filter(t => !t.deleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(t => [
      formatDateDDMMMYY(t.date),
      `"${t.merchant.replace(/"/g, '""')}"`,
      t.category,
      t.amount.toString(),
      t.emiMonths ? `${t.emiMonths} mos` : 'None',
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);

  const summary = [
    `"Card: ${card.name} (${card.bank} •••• ${card.last4})"`,
    `"Statement Period: ${periodTitle}"`,
    `"Opening Balance: ৳ ${openingBalance}"`,
    `"Total New Spend: ৳ ${totalSpend}"`,
    `"Total Due: ৳ ${openingBalance + totalSpend}"`,
    '',
  ];

  const csvContent = [...summary, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `PocketPilot-${card.bank.replace(/\s+/g, '_')}-Stmt-${periodTitle.replace(/\s+/g, '_')}.csv`;
  downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
}

/**
 * Download complete JSON backup
 */
export function exportAppDataJSON(data: AppData) {
  const json = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `pocketpilot-backup-${dateStr}.json`;
  downloadFile(filename, json, 'application/json');
}

/**
 * Read and validate uploaded JSON backup file
 */
export async function readBackupJSONFile(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as AppData;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.expenses)) {
          throw new Error('Invalid Pocket Pilot backup file structure');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(err.message || 'Corrupt JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

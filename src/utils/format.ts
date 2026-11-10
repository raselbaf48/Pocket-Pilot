/**
 * Pocket Pilot Formatting Utilities
 * Handles Bangladeshi Taka (৳) currency and DD MMM YY date display.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format a Date or date string to DD MMM YY (e.g. 10 Nov 26)
 */
export function formatDateDDMMMYY(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  
  // Handle 'YYYY-MM-DD' or ISO strings
  const parts = typeof dateInput === 'string' && dateInput.includes('-')
    ? dateInput.split('T')[0].split('-').map(Number)
    : null;

  let d: number, m: number, y: number;
  if (parts && parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    y = parts[0];
    m = parts[1] - 1;
    d = parts[2];
  } else {
    const dt = new Date(dateInput);
    if (isNaN(dt.getTime())) return '—';
    y = dt.getFullYear();
    m = dt.getMonth();
    d = dt.getDate();
  }

  const dayStr = String(d).padStart(2, '0');
  const monthStr = MONTH_NAMES[m] || '';
  const yearStr = String(y).slice(-2);

  return `${dayStr} ${monthStr} ${yearStr}`;
}

/**
 * Format to ISO YYYY-MM-DD for form inputs
 */
export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add calendar months to a YYYY-MM-DD date string
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return toISODate();
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const dt = new Date(y, m - 1 + monthsToAdd, d);
  return toISODate(dt);
}

/**
 * Difference in calendar days between today and target date
 */
export function getDaysDifference(targetDateStr: string, fromDateStr: string = toISODate()): number {
  const [ty, tm, td] = targetDateStr.split('T')[0].split('-').map(Number);
  const [fy, fm, fd] = fromDateStr.split('T')[0].split('-').map(Number);
  
  const targetTime = new Date(ty, tm - 1, td).getTime();
  const fromTime = new Date(fy, fm - 1, fd).getTime();
  
  const diffMs = targetTime - fromTime;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Currency formatter for Bangladeshi Taka (৳)
 */
export function formatTaka(amount: number | undefined | null, includeDecimals = false): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(val);
  return `৳ ${formatted}`;
}

/**
 * Simple UUID generator fallback
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

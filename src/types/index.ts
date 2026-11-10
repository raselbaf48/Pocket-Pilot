/**
 * Pocket Pilot - Unified Data Types
 * All records include UUID, timestamps, and soft-delete for robust Google Drive sync.
 */

export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Bank' | 'Credit Card';

export interface BaseRecord {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deleted?: boolean;
}

export interface Expense extends BaseRecord {
  type: 'expense' | 'income';
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: string;
  paymentMethod: PaymentMethod;
  cardId?: string; // Optional reference if paid with Credit Card
  note?: string;
}

export interface Category extends BaseRecord {
  name: string;
  icon: string; // Lucide icon identifier
  color: string; // Hex or tailwind color
  type: 'expense' | 'income';
  monthlyBudget?: number; // In BDT (৳)
}

export interface Vehicle extends BaseRecord {
  name: string;
  model: string;
  regNumber: string;
  currentOdo: number; // in KM
}

export interface FuelLog extends BaseRecord {
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  isFullTank: boolean;
  notes?: string;
}

export interface BikeServiceLog extends BaseRecord {
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  serviceType: string; // e.g. "Engine Oil", "Chain Lube", "Brake Pad", "Tax Token", "Insurance"
  cost: number;
  workshop?: string;
  notes?: string;
}

export interface BikeReminder extends BaseRecord {
  vehicleId: string;
  title: string;
  reminderType: 'odometer' | 'date' | 'both';
  targetOdometer?: number;
  targetDate?: string; // YYYY-MM-DD
  isCompleted: boolean;
  notes?: string;
}

export interface CreditCard extends BaseRecord {
  name: string;
  bank: string;
  last4: string;
  creditLimit: number;
  statementDay: number; // Day of month 1-31
  paymentDueDays: number; // Days after statement (default e.g. 15-20 days)
  color?: string;
}

export interface CardTransaction extends BaseRecord {
  cardId: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  category: string;
  emiMonths?: number;
  note?: string;
}

export interface CardPayment extends BaseRecord {
  cardId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  reference?: string;
  note?: string;
}

export type SupplyUnit = 'Ea' | 'Pair' | 'Set';

export interface SupplyItem extends BaseRecord {
  serNo: number;
  name: string;
  cycleMonths: number;
  lastIssueDate: string; // YYYY-MM-DD
  maxQty: number;
  unit: SupplyUnit;
  remarks?: string;
}

export interface SupplyIssueHistory extends BaseRecord {
  itemId: string;
  issueDate: string; // YYYY-MM-DD
  qty: number;
  remarks?: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  currency: string;
  defaultDueWarningDays: number; // default 30
  googleClientId?: string;
  enableAlerts: boolean;
  lastSyncedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface AppData {
  schemaVersion: number;
  updatedAt: string;
  expenses: Expense[];
  categories: Category[];
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  serviceLogs: BikeServiceLog[];
  bikeReminders: BikeReminder[];
  creditCards: CreditCard[];
  cardTransactions: CardTransaction[];
  cardPayments: CardPayment[];
  supplyItems: SupplyItem[];
  supplyHistory: SupplyIssueHistory[];
  settings: UserSettings;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'conflict' | 'unauthorized';

export interface DriveBackupVersion {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

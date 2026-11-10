/**
 * Local-First Storage & Default State Engine for Pocket Pilot
 * Manages atomic localStorage persistence, schema migrations, and seed data.
 */

import { AppData, Expense, Category, Vehicle, FuelLog, BikeServiceLog, BikeReminder, CreditCard, CardTransaction, CardPayment, SupplyItem } from '../types';
import { generateUUID, toISODate, addMonthsToDate } from '../utils/format';

export const CURRENT_SCHEMA_VERSION = 1;
const STORAGE_KEY = 'pocketpilot_appdata_v1';
const USER_PROFILE_KEY = 'pocketpilot_user_profile';
const ACCESS_TOKEN_KEY = 'pocketpilot_auth_token_meta';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Dining', icon: 'Utensils', color: '#10B981', type: 'expense', monthlyBudget: 15000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-transport', name: 'Transport & Fuel', icon: 'Bike', color: '#06B6D4', type: 'expense', monthlyBudget: 6000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-bills', name: 'Bills & Utilities', icon: 'Zap', color: '#F59E0B', type: 'expense', monthlyBudget: 8000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#EC4899', type: 'expense', monthlyBudget: 7000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-health', name: 'Health & Medical', icon: 'HeartPulse', color: '#EF4444', type: 'expense', monthlyBudget: 3000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-family', name: 'Family & Home', icon: 'Home', color: '#8B5CF6', type: 'expense', monthlyBudget: 10000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-recharge', name: 'Mobile Recharge', icon: 'Smartphone', color: '#14B8A6', type: 'expense', monthlyBudget: 1500, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-others', name: 'Others', icon: 'Layers', color: '#64748B', type: 'expense', monthlyBudget: 4000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-salary', name: 'Salary', icon: 'Wallet', color: '#22C55E', type: 'income', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-freelance', name: 'Allowance / Freelance', icon: 'Coins', color: '#3B82F6', type: 'income', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export function getInitialSeedData(): AppData {
  const today = toISODate();
  const lastMonth = toISODate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const threeMonthsAgo = toISODate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  const sevenMonthsAgo = toISODate(new Date(Date.now() - 210 * 24 * 60 * 60 * 1000));
  const nineMonthsAgo = toISODate(new Date(Date.now() - 275 * 24 * 60 * 60 * 1000));
  const twoYearsAgo = toISODate(new Date(Date.now() - 730 * 24 * 60 * 60 * 1000));

  const sampleVehicle: Vehicle = {
    id: 'veh-yamaha-1',
    name: 'Yamaha FZ-S Fi V3',
    model: '150cc BS6 Dark Knight',
    regNumber: 'Dhaka Metro-LA 45-8912',
    currentOdo: 8940,
    createdAt: threeMonthsAgo,
    updatedAt: today,
  };

  const sampleFuelLogs: FuelLog[] = [
    {
      id: generateUUID(),
      vehicleId: sampleVehicle.id,
      date: toISODate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
      odometer: 8520,
      liters: 10.0,
      pricePerLiter: 130,
      totalCost: 1300,
      isFullTank: true,
      notes: 'Octane fill-up at Meghna Petrol Pump',
      createdAt: toISODate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
      updatedAt: toISODate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
    },
    {
      id: generateUUID(),
      vehicleId: sampleVehicle.id,
      date: toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      odometer: 8940,
      liters: 9.8,
      pricePerLiter: 130,
      totalCost: 1274,
      isFullTank: true,
      notes: 'Full tank - 42.8 km/l achieved!',
      createdAt: toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      updatedAt: toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    }
  ];

  const sampleServiceLogs: BikeServiceLog[] = [
    {
      id: generateUUID(),
      vehicleId: sampleVehicle.id,
      date: toISODate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
      odometer: 8400,
      serviceType: 'Engine Oil',
      cost: 750,
      workshop: 'Yamaha Service Center Tejgaon',
      notes: 'Yamalube 10W40 Full Synthetic replaced with oil filter',
      createdAt: toISODate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
      updatedAt: toISODate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
    }
  ];

  const sampleReminders: BikeReminder[] = [
    {
      id: generateUUID(),
      vehicleId: sampleVehicle.id,
      title: 'Engine Oil Change (Every 2,000 km)',
      reminderType: 'odometer',
      targetOdometer: 10400,
      isCompleted: false,
      notes: 'Keep 10W-40 full synthetic in stock',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      vehicleId: sampleVehicle.id,
      title: 'Chain Lubrication & Cleaning',
      reminderType: 'odometer',
      targetOdometer: 9300,
      isCompleted: false,
      notes: 'Use Motul chain clean and lube spray',
      createdAt: today,
      updatedAt: today,
    }
  ];

  const sampleCard: CreditCard = {
    id: 'card-scb-1',
    name: 'Simply Cash Visa',
    bank: 'Standard Chartered Bangladesh',
    last4: '4821',
    creditLimit: 120000,
    statementDay: 15,
    paymentDueDays: 20, // 20 days after statement -> Due 5th of next month
    color: '#0284C7',
    createdAt: threeMonthsAgo,
    updatedAt: today,
  };

  const sampleCardTransactions: CardTransaction[] = [
    {
      id: generateUUID(),
      cardId: sampleCard.id,
      date: toISODate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
      merchant: 'Shwapno Supermarket',
      amount: 4250,
      category: 'Food & Dining',
      note: 'Monthly groceries and household items',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      cardId: sampleCard.id,
      date: toISODate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
      merchant: 'Star Cineplex Bashundhara',
      amount: 1100,
      category: 'Shopping',
      note: 'Movie tickets and snacks',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      cardId: sampleCard.id,
      date: toISODate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      merchant: 'Daraz Bangladesh',
      amount: 3200,
      category: 'Shopping',
      note: 'Electronics accessories',
      createdAt: today,
      updatedAt: today,
    }
  ];

  const sampleCardPayments: CardPayment[] = [
    {
      id: generateUUID(),
      cardId: sampleCard.id,
      date: toISODate(new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)),
      amount: 18500,
      reference: 'SCB-BEFTN-99812',
      note: 'Cleared previous month statement in full',
      createdAt: today,
      updatedAt: today,
    }
  ];

  const sampleExpenses: Expense[] = [
    {
      id: generateUUID(),
      type: 'income',
      amount: 65000,
      date: toISODate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
      categoryId: 'cat-salary',
      paymentMethod: 'Bank',
      note: 'Monthly official salary credited',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      type: 'expense',
      amount: 1250,
      date: toISODate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
      categoryId: 'cat-food',
      paymentMethod: 'bKash',
      note: 'Dinner at Sultan Dine Kacchi',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      type: 'expense',
      amount: 1274,
      date: toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      categoryId: 'cat-transport',
      paymentMethod: 'Cash',
      note: 'Octane fill-up for bike',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      type: 'expense',
      amount: 650,
      date: toISODate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
      categoryId: 'cat-recharge',
      paymentMethod: 'bKash',
      note: 'Grameenphone 30-day internet package',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      type: 'expense',
      amount: 2200,
      date: toISODate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
      categoryId: 'cat-bills',
      paymentMethod: 'Nagad',
      note: 'DESCO electricity bill',
      createdAt: today,
      updatedAt: today,
    }
  ];

  // Specific user requirement:
  // Pre-fill sample data:
  // - Shoes BL (9 months, 1 Pair)
  // - Socks Nylon BL (9 months, 3 Pair)
  // - Blanket C/S (48 months, 1 Ea)
  // - Belt Nylon Narrow BG (6 months, 1 Ea)
  // - Towel Hand (6 months, 3 Ea)
  const sampleSupplyItems: SupplyItem[] = [
    {
      id: generateUUID(),
      serNo: 1,
      name: 'Shoes BL',
      cycleMonths: 9,
      lastIssueDate: nineMonthsAgo, // exactly 9 months ago -> due now!
      maxQty: 1,
      unit: 'Pair',
      remarks: 'Official issue pair',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      serNo: 2,
      name: 'Socks Nylon BL',
      cycleMonths: 9,
      lastIssueDate: sevenMonthsAgo, // ~7 months ago -> due in ~2 months
      maxQty: 3,
      unit: 'Pair',
      remarks: 'Black nylon issue pack',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      serNo: 3,
      name: 'Blanket C/S',
      cycleMonths: 48,
      lastIssueDate: twoYearsAgo, // 24 months ago -> 24 months left
      maxQty: 1,
      unit: 'Ea',
      remarks: 'Winter comfort issue',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      serNo: 4,
      name: 'Belt Nylon Narrow BG',
      cycleMonths: 6,
      lastIssueDate: toISODate(new Date(Date.now() - 170 * 24 * 60 * 60 * 1000)), // due in 10 days! Due Soon!
      maxQty: 1,
      unit: 'Ea',
      remarks: 'Battle Green narrow belt',
      createdAt: today,
      updatedAt: today,
    },
    {
      id: generateUUID(),
      serNo: 5,
      name: 'Towel Hand',
      cycleMonths: 6,
      lastIssueDate: toISODate(new Date(Date.now() - 195 * 24 * 60 * 60 * 1000)), // ~6.5 months ago -> Overdue!
      maxQty: 3,
      unit: 'Ea',
      remarks: 'Cotton hand towels set',
      createdAt: today,
      updatedAt: today,
    }
  ];

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    expenses: sampleExpenses,
    categories: DEFAULT_CATEGORIES,
    vehicles: [sampleVehicle],
    fuelLogs: sampleFuelLogs,
    serviceLogs: sampleServiceLogs,
    bikeReminders: sampleReminders,
    creditCards: [sampleCard],
    cardTransactions: sampleCardTransactions,
    cardPayments: sampleCardPayments,
    supplyItems: sampleSupplyItems,
    supplyHistory: [],
    settings: {
      theme: 'dark',
      currency: '৳',
      defaultDueWarningDays: 30,
      enableAlerts: true,
      lastSyncedAt: undefined,
    }
  };
}

/**
 * Load app data from localStorage. If none found or corrupted, seeds initial data.
 */
export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedData();
      saveAppData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppData;
    // Migrate or fill missing collections if schema changed
    if (!parsed.schemaVersion || parsed.schemaVersion < CURRENT_SCHEMA_VERSION) {
      const initial = getInitialSeedData();
      parsed.categories = parsed.categories || initial.categories;
      parsed.vehicles = parsed.vehicles || initial.vehicles;
      parsed.fuelLogs = parsed.fuelLogs || [];
      parsed.serviceLogs = parsed.serviceLogs || [];
      parsed.bikeReminders = parsed.bikeReminders || [];
      parsed.creditCards = parsed.creditCards || [];
      parsed.cardTransactions = parsed.cardTransactions || [];
      parsed.cardPayments = parsed.cardPayments || [];
      parsed.supplyItems = parsed.supplyItems || initial.supplyItems;
      parsed.supplyHistory = parsed.supplyHistory || [];
      parsed.settings = { ...initial.settings, ...(parsed.settings || {}) };
      parsed.schemaVersion = CURRENT_SCHEMA_VERSION;
      saveAppData(parsed);
    }
    return parsed;
  } catch (err) {
    console.error('Error reading localStorage app data, resetting to seed data:', err);
    const initial = getInitialSeedData();
    saveAppData(initial);
    return initial;
  }
}

/**
 * Save data atomically to localStorage with updated timestamp
 */
export function saveAppData(data: AppData): void {
  try {
    const toSave: AppData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Auth token and profile storage
 */
export function getSavedUserProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: any) {
  if (!profile) {
    localStorage.removeItem(USER_PROFILE_KEY);
  } else {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  }
}

export function getSavedAuthToken(): { token: string; expiresAt: number } | null {
  try {
    const raw = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt - 60000) {
      // expired or about to expire in 1 minute
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthToken(token: string, expiresInSeconds: number = 3600) {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify({ token, expiresAt }));
}

export function clearAuthToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

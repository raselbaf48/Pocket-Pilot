/**
 * Global App Context for Pocket Pilot
 * Coordinates local state, Google Drive auto-sync, conflict resolution, and navigation.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  AppData,
  SyncStatus,
  UserProfile,
  Expense,
  Category,
  Vehicle,
  FuelLog,
  BikeServiceLog,
  BikeReminder,
  CreditCard,
  CardTransaction,
  CardPayment,
  SupplyItem,
  SupplyIssueHistory,
  UserSettings
} from '../types';
import {
  loadAppData,
  saveAppData,
  getSavedUserProfile,
  saveUserProfile,
  getSavedAuthToken
} from '../services/storage';
import {
  AUTO_SYNC_DEBOUNCE_MS,
  DRIVE_POLL_INTERVAL_MS,
  DRIVE_DATA_FILENAME
} from '../config/google';
import {
  getCachedToken,
  requestGoogleLogin,
  signOutGoogle,
  fetchGoogleUserProfile,
  uploadDataToDrive,
  findDriveFile,
  downloadDriveFile,
  createDailyBackupSnapshot,
  mergeAppData,
  getEffectiveClientId
} from '../services/driveSync';
import { generateUUID, toISODate, addMonthsToDate } from '../utils/format';

export type NavTab = 'home' | 'expenses' | 'bike' | 'cards' | 'supplies' | 'settings';

interface ConflictState {
  isOpen: boolean;
  cloudData: AppData | null;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
}

interface AppContextType {
  data: AppData;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  syncStatus: SyncStatus;
  lastSyncedTime: string | null;
  syncErrorMessage: string | null;
  userProfile: UserProfile | null;
  isOfflineOnly: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  conflictState: ConflictState;
  resolveConflict: (choice: 'cloud' | 'local' | 'merge') => Promise<void>;
  quickAddType: 'expense' | 'fuel' | 'card_spend' | null;
  setQuickAddType: (type: 'expense' | 'fuel' | 'card_spend' | null) => void;
  
  // Auth actions
  loginWithGoogle: (promptSelect?: boolean) => Promise<void>;
  logout: () => void;
  continueOfflineMode: () => void;
  triggerManualSync: () => Promise<void>;
  
  // Expenses actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addCategory: (cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Bike actions
  addVehicle: (veh: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addFuelLog: (log: Omit<FuelLog, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteFuelLog: (id: string) => void;
  addServiceLog: (log: Omit<BikeServiceLog, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteServiceLog: (id: string) => void;
  addBikeReminder: (reminder: Omit<BikeReminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  toggleBikeReminder: (id: string) => void;
  deleteBikeReminder: (id: string) => void;

  // Credit Card actions
  addCreditCard: (card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCreditCard: (id: string, updates: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  addCardTransaction: (tx: Omit<CardTransaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteCardTransaction: (id: string) => void;
  addCardPayment: (pmt: Omit<CardPayment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteCardPayment: (id: string) => void;

  // Supply Items actions
  addSupplyItem: (item: Omit<SupplyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSupplyItem: (id: string, updates: Partial<SupplyItem>) => void;
  deleteSupplyItem: (id: string) => void;
  issueSupplyItem: (itemId: string, issueDate: string, qty: number, remarks?: string) => void;

  // Settings & General
  updateSettings: (updates: Partial<UserSettings>) => void;
  restoreFromData: (newData: AppData) => Promise<void>;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return loadAppData().settings?.lastSyncedAt || null;
  });
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getSavedUserProfile());
  const [isOfflineOnly, setIsOfflineOnly] = useState<boolean>(() => {
    return !getSavedUserProfile() && localStorage.getItem('pocketpilot_offline_mode') === 'true';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [quickAddType, setQuickAddType] = useState<'expense' | 'fuel' | 'card_spend' | null>(null);

  const [conflictState, setConflictState] = useState<ConflictState>({
    isOpen: false,
    cloudData: null,
    localUpdatedAt: '',
    cloudUpdatedAt: '',
  });

  // Track state in ref for intervals & debounced sync
  const dataRef = useRef<AppData>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncInProgressRef = useRef<boolean>(false);

  // Sync function to Google Drive
  const performDriveSync = useCallback(async (currentData: AppData, forceUpload = false): Promise<void> => {
    const token = getCachedToken();
    if (!token) {
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('synced');
      }
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    if (isSyncInProgressRef.current) return;
    isSyncInProgressRef.current = true;
    setSyncStatus('syncing');
    setSyncErrorMessage(null);

    try {
      const driveFile = await findDriveFile(DRIVE_DATA_FILENAME);
      
      if (!driveFile) {
        // No file in cloud yet -> upload current
        await uploadDataToDrive(currentData);
        await createDailyBackupSnapshot(currentData);
        const nowIso = new Date().toISOString();
        setLastSyncedTime(nowIso);
        setSyncStatus('synced');
        return;
      }

      if (forceUpload) {
        await uploadDataToDrive(currentData);
        await createDailyBackupSnapshot(currentData);
        const nowIso = new Date().toISOString();
        setLastSyncedTime(nowIso);
        setSyncStatus('synced');
        return;
      }

      // Check cloud file content
      const cloudData = await downloadDriveFile(driveFile.id);
      const localTime = new Date(currentData.updatedAt || 0).getTime();
      const cloudTime = new Date(cloudData.updatedAt || 0).getTime();
      const lastSyncedMs = currentData.settings?.lastSyncedAt ? new Date(currentData.settings.lastSyncedAt).getTime() : 0;

      // Conflict detection: both changed since last sync and differ
      if (lastSyncedMs > 0 && localTime > lastSyncedMs && cloudTime > lastSyncedMs && Math.abs(localTime - cloudTime) > 3000) {
        setSyncStatus('conflict');
        setConflictState({
          isOpen: true,
          cloudData,
          localUpdatedAt: currentData.updatedAt,
          cloudUpdatedAt: cloudData.updatedAt,
        });
        return;
      }

      if (cloudTime > localTime) {
        // Cloud is newer -> replace local
        saveAppData(cloudData);
        setData(cloudData);
        const nowIso = new Date().toISOString();
        setLastSyncedTime(nowIso);
        setSyncStatus('synced');
      } else if (localTime > cloudTime) {
        // Local is newer -> upload to cloud
        await uploadDataToDrive(currentData);
        await createDailyBackupSnapshot(currentData);
        const nowIso = new Date().toISOString();
        setLastSyncedTime(nowIso);
        setSyncStatus('synced');
      } else {
        // Identical
        setSyncStatus('synced');
      }
    } catch (err: any) {
      console.error('Drive Sync Error:', err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'Sync failed');
    } finally {
      isSyncInProgressRef.current = false;
    }
  }, []);

  // Queue debounced auto-sync whenever data changes
  const queueAutoSync = useCallback((newData: AppData) => {
    saveAppData(newData);
    setData(newData);

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = setTimeout(() => {
      performDriveSync(dataRef.current);
    }, AUTO_SYNC_DEBOUNCE_MS);
  }, [performDriveSync]);

  // Window listeners: online, offline, visibility change, beforeunload, focus
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('syncing');
      performDriveSync(dataRef.current);
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Upload immediately if there are pending local updates
        if (autoSyncTimerRef.current) {
          clearTimeout(autoSyncTimerRef.current);
          performDriveSync(dataRef.current);
        }
      } else if (document.visibilityState === 'visible') {
        // On returning to tab, poll Drive
        performDriveSync(dataRef.current);
      }
    };
    const handleFocus = () => {
      performDriveSync(dataRef.current);
    };
    const handleBeforeUnload = () => {
      // Best effort save
      saveAppData(dataRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial check
    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      performDriveSync(dataRef.current);
    }

    // 60-second polling
    const pollInterval = setInterval(() => {
      if (navigator.onLine && getCachedToken()) {
        performDriveSync(dataRef.current);
      }
    }, DRIVE_POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(pollInterval);
      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    };
  }, [performDriveSync]);

  // Resolve sync conflict
  const resolveConflict = async (choice: 'cloud' | 'local' | 'merge') => {
    const cloud = conflictState.cloudData;
    const local = dataRef.current;
    if (!cloud) {
      setConflictState({ isOpen: false, cloudData: null, localUpdatedAt: '', cloudUpdatedAt: '' });
      return;
    }

    let finalData: AppData;
    if (choice === 'cloud') {
      finalData = cloud;
    } else if (choice === 'local') {
      finalData = local;
    } else {
      finalData = mergeAppData(local, cloud);
    }

    finalData.settings.lastSyncedAt = new Date().toISOString();
    saveAppData(finalData);
    setData(finalData);
    setConflictState({ isOpen: false, cloudData: null, localUpdatedAt: '', cloudUpdatedAt: '' });
    
    // Upload winning data to Drive
    await performDriveSync(finalData, true);
  };

  // Google Login
  const loginWithGoogle = async (promptSelect = false) => {
    try {
      setSyncStatus('syncing');
      const clientId = getEffectiveClientId(data.settings?.googleClientId);
      const token = await requestGoogleLogin(clientId, promptSelect);
      const profile = await fetchGoogleUserProfile(token);
      if (profile) {
        setUserProfile(profile);
      }
      setIsOfflineOnly(false);
      localStorage.removeItem('pocketpilot_offline_mode');
      setIsAuthModalOpen(false);
      
      // Immediately sync with Drive
      await performDriveSync(dataRef.current);
    } catch (err: any) {
      console.error('Login error:', err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = () => {
    signOutGoogle();
    setUserProfile(null);
    setIsOfflineOnly(true);
    setSyncStatus('synced');
  };

  const continueOfflineMode = () => {
    setIsOfflineOnly(true);
    localStorage.setItem('pocketpilot_offline_mode', 'true');
    setIsAuthModalOpen(false);
  };

  const triggerManualSync = async () => {
    await performDriveSync(dataRef.current, false);
  };

  // Theme application
  useEffect(() => {
    const theme = data.settings?.theme || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.settings?.theme]);

  // MUTATIONS (all functional, immutable, with timestamps and UUIDs)

  // Expense
  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newRecord: Expense = {
      ...expense,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      expenses: [newRecord, ...dataRef.current.expenses],
    };
    queueAutoSync(next);
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      expenses: dataRef.current.expenses.map(e => (e.id === id ? { ...e, ...updates, updatedAt: now } : e)),
    };
    queueAutoSync(next);
  };

  const deleteExpense = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      expenses: dataRef.current.expenses.map(e => (e.id === id ? { ...e, deleted: true, updatedAt: now } : e)),
    };
    queueAutoSync(next);
  };

  // Category
  const addCategory = (cat: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newCat: Category = {
      ...cat,
      id: `cat-${generateUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      categories: [...dataRef.current.categories, newCat],
    };
    queueAutoSync(next);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      categories: dataRef.current.categories.map(c => (c.id === id ? { ...c, ...updates, updatedAt: now } : c)),
    };
    queueAutoSync(next);
  };

  const deleteCategory = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      categories: dataRef.current.categories.map(c => (c.id === id ? { ...c, deleted: true, updatedAt: now } : c)),
    };
    queueAutoSync(next);
  };

  // Vehicles & Bike logs
  const addVehicle = (veh: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newVeh: Vehicle = {
      ...veh,
      id: `veh-${generateUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      vehicles: [...dataRef.current.vehicles, newVeh],
    };
    queueAutoSync(next);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      vehicles: dataRef.current.vehicles.map(v => (v.id === id ? { ...v, ...updates, updatedAt: now } : v)),
    };
    queueAutoSync(next);
  };

  const deleteVehicle = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      vehicles: dataRef.current.vehicles.map(v => (v.id === id ? { ...v, deleted: true, updatedAt: now } : v)),
    };
    queueAutoSync(next);
  };

  const addFuelLog = (log: Omit<FuelLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newLog: FuelLog = {
      ...log,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    
    // Also auto-update vehicle currentOdo if higher
    const targetVeh = dataRef.current.vehicles.find(v => v.id === log.vehicleId);
    let updatedVehicles = dataRef.current.vehicles;
    if (targetVeh && log.odometer > targetVeh.currentOdo) {
      updatedVehicles = dataRef.current.vehicles.map(v =>
        v.id === log.vehicleId ? { ...v, currentOdo: log.odometer, updatedAt: now } : v
      );
    }

    const next: AppData = {
      ...dataRef.current,
      vehicles: updatedVehicles,
      fuelLogs: [newLog, ...dataRef.current.fuelLogs],
    };
    queueAutoSync(next);
  };

  const deleteFuelLog = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      fuelLogs: dataRef.current.fuelLogs.map(f => (f.id === id ? { ...f, deleted: true, updatedAt: now } : f)),
    };
    queueAutoSync(next);
  };

  const addServiceLog = (log: Omit<BikeServiceLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newLog: BikeServiceLog = {
      ...log,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };

    // Update vehicle odo if higher
    const targetVeh = dataRef.current.vehicles.find(v => v.id === log.vehicleId);
    let updatedVehicles = dataRef.current.vehicles;
    if (targetVeh && log.odometer > targetVeh.currentOdo) {
      updatedVehicles = dataRef.current.vehicles.map(v =>
        v.id === log.vehicleId ? { ...v, currentOdo: log.odometer, updatedAt: now } : v
      );
    }

    const next: AppData = {
      ...dataRef.current,
      vehicles: updatedVehicles,
      serviceLogs: [newLog, ...dataRef.current.serviceLogs],
    };
    queueAutoSync(next);
  };

  const deleteServiceLog = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      serviceLogs: dataRef.current.serviceLogs.map(s => (s.id === id ? { ...s, deleted: true, updatedAt: now } : s)),
    };
    queueAutoSync(next);
  };

  const addBikeReminder = (reminder: Omit<BikeReminder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newRem: BikeReminder = {
      ...reminder,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      bikeReminders: [newRem, ...dataRef.current.bikeReminders],
    };
    queueAutoSync(next);
  };

  const toggleBikeReminder = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      bikeReminders: dataRef.current.bikeReminders.map(r =>
        r.id === id ? { ...r, isCompleted: !r.isCompleted, updatedAt: now } : r
      ),
    };
    queueAutoSync(next);
  };

  const deleteBikeReminder = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      bikeReminders: dataRef.current.bikeReminders.map(r => (r.id === id ? { ...r, deleted: true, updatedAt: now } : r)),
    };
    queueAutoSync(next);
  };

  // Credit Cards
  const addCreditCard = (card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newCard: CreditCard = {
      ...card,
      id: `card-${generateUUID().slice(0, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      creditCards: [...dataRef.current.creditCards, newCard],
    };
    queueAutoSync(next);
  };

  const updateCreditCard = (id: string, updates: Partial<CreditCard>) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      creditCards: dataRef.current.creditCards.map(c => (c.id === id ? { ...c, ...updates, updatedAt: now } : c)),
    };
    queueAutoSync(next);
  };

  const deleteCreditCard = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      creditCards: dataRef.current.creditCards.map(c => (c.id === id ? { ...c, deleted: true, updatedAt: now } : c)),
    };
    queueAutoSync(next);
  };

  const addCardTransaction = (tx: Omit<CardTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTx: CardTransaction = {
      ...tx,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      cardTransactions: [newTx, ...dataRef.current.cardTransactions],
    };
    queueAutoSync(next);
  };

  const deleteCardTransaction = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      cardTransactions: dataRef.current.cardTransactions.map(t => (t.id === id ? { ...t, deleted: true, updatedAt: now } : t)),
    };
    queueAutoSync(next);
  };

  const addCardPayment = (pmt: Omit<CardPayment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newPmt: CardPayment = {
      ...pmt,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      cardPayments: [newPmt, ...dataRef.current.cardPayments],
    };
    queueAutoSync(next);
  };

  const deleteCardPayment = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      cardPayments: dataRef.current.cardPayments.map(p => (p.id === id ? { ...p, deleted: true, updatedAt: now } : p)),
    };
    queueAutoSync(next);
  };

  // Supply Items
  const addSupplyItem = (item: Omit<SupplyItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const maxSer = dataRef.current.supplyItems.reduce((max, i) => (!i.deleted && i.serNo > max ? i.serNo : max), 0);
    const newItem: SupplyItem = {
      ...item,
      serNo: item.serNo || maxSer + 1,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      supplyItems: [...dataRef.current.supplyItems, newItem],
    };
    queueAutoSync(next);
  };

  const updateSupplyItem = (id: string, updates: Partial<SupplyItem>) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      supplyItems: dataRef.current.supplyItems.map(i => (i.id === id ? { ...i, ...updates, updatedAt: now } : i)),
    };
    queueAutoSync(next);
  };

  const deleteSupplyItem = (id: string) => {
    const now = new Date().toISOString();
    const next: AppData = {
      ...dataRef.current,
      supplyItems: dataRef.current.supplyItems.map(i => (i.id === id ? { ...i, deleted: true, updatedAt: now } : i)),
    };
    queueAutoSync(next);
  };

  const issueSupplyItem = (itemId: string, issueDate: string, qty: number, remarks?: string) => {
    const now = new Date().toISOString();
    const historyEntry: SupplyIssueHistory = {
      id: generateUUID(),
      itemId,
      issueDate,
      qty,
      remarks,
      createdAt: now,
      updatedAt: now,
    };
    const next: AppData = {
      ...dataRef.current,
      supplyItems: dataRef.current.supplyItems.map(i =>
        i.id === itemId ? { ...i, lastIssueDate: issueDate, updatedAt: now } : i
      ),
      supplyHistory: [historyEntry, ...dataRef.current.supplyHistory],
    };
    queueAutoSync(next);
  };

  // Settings
  const updateSettings = (updates: Partial<UserSettings>) => {
    const next: AppData = {
      ...dataRef.current,
      settings: {
        ...dataRef.current.settings,
        ...updates,
      },
    };
    queueAutoSync(next);
  };

  const restoreFromData = async (newData: AppData) => {
    const now = new Date().toISOString();
    const sanitized: AppData = {
      ...newData,
      updatedAt: now,
      settings: {
        ...newData.settings,
        lastSyncedAt: now,
      }
    };
    saveAppData(sanitized);
    setData(sanitized);
    await performDriveSync(sanitized, true);
  };

  const resetToDefaultData = () => {
    localStorage.removeItem('pocketpilot_appdata_v1');
    const fresh = loadAppData();
    setData(fresh);
    saveAppData(fresh);
    performDriveSync(fresh, true);
  };

  return (
    <AppContext.Provider
      value={{
        data,
        activeTab,
        setActiveTab,
        syncStatus,
        lastSyncedTime,
        syncErrorMessage,
        userProfile,
        isOfflineOnly,
        isAuthModalOpen,
        setIsAuthModalOpen,
        conflictState,
        resolveConflict,
        quickAddType,
        setQuickAddType,
        loginWithGoogle,
        logout,
        continueOfflineMode,
        triggerManualSync,
        addExpense,
        updateExpense,
        deleteExpense,
        addCategory,
        updateCategory,
        deleteCategory,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addFuelLog,
        deleteFuelLog,
        addServiceLog,
        deleteServiceLog,
        addBikeReminder,
        toggleBikeReminder,
        deleteBikeReminder,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        addCardTransaction,
        deleteCardTransaction,
        addCardPayment,
        deleteCardPayment,
        addSupplyItem,
        updateSupplyItem,
        deleteSupplyItem,
        issueSupplyItem,
        updateSettings,
        restoreFromData,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

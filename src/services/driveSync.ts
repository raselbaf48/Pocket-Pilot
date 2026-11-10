/**
 * Google Drive Sync & Backup Service (appDataFolder)
 * Fully local-first with offline capability, conflict resolution, and versioned backups.
 */

import { AppData, DriveBackupVersion, BaseRecord } from '../types';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, DRIVE_DATA_FILENAME, DRIVE_BACKUP_PREFIX, MAX_DRIVE_BACKUPS } from '../config/google';
import { saveAppData, saveAuthToken, getSavedAuthToken, clearAuthToken, saveUserProfile, getSavedUserProfile } from './storage';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

let cachedAccessToken: string | null = null;
let tokenClient: any = null;

export function getEffectiveClientId(customId?: string): string {
  return customId || localStorage.getItem('pocketpilot_custom_client_id') || GOOGLE_CLIENT_ID;
}

export function isGoogleIdentityReady(): boolean {
  return typeof window !== 'undefined' && !!window.google?.accounts?.oauth2;
}

export function initGoogleAuth(clientId: string, onTokenReceived: (token: string) => void, onError?: (err: any) => void) {
  if (!isGoogleIdentityReady()) return null;
  try {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          console.error('Google OAuth error:', resp);
          if (onError) onError(resp);
          return;
        }
        if (resp.access_token) {
          cachedAccessToken = resp.access_token;
          const expiresIn = resp.expires_in ? parseInt(resp.expires_in, 10) : 3600;
          saveAuthToken(resp.access_token, expiresIn);
          onTokenReceived(resp.access_token);
        }
      },
      error_callback: (err: any) => {
        console.error('Google OAuth init error:', err);
        if (onError) onError(err);
      }
    });
    return tokenClient;
  } catch (err) {
    console.error('Failed to initialize Google Token Client:', err);
    if (onError) onError(err);
    return null;
  }
}

export async function requestGoogleLogin(clientId: string, promptSelect = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isGoogleIdentityReady()) {
      reject(new Error('Google Identity Services script not yet loaded. Please check your internet connection.'));
      return;
    }
    const client = initGoogleAuth(
      clientId,
      (token) => resolve(token),
      (err) => reject(new Error(err?.message || 'Google sign-in was cancelled or failed.'))
    );
    if (!client) {
      reject(new Error('Failed to create Google Auth Client.'));
      return;
    }
    client.requestAccessToken({ prompt: promptSelect ? 'select_account' : '' });
  });
}

export async function fetchGoogleUserProfile(token: string) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    const info = await res.json();
    const profile = {
      id: info.sub,
      name: info.name || info.email.split('@')[0],
      email: info.email,
      picture: info.picture,
    };
    saveUserProfile(profile);
    return profile;
  } catch (err) {
    console.warn('Could not retrieve user info from Google:', err);
    return getSavedUserProfile();
  }
}

export function getCachedToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;
  const saved = getSavedAuthToken();
  if (saved) {
    cachedAccessToken = saved.token;
    return saved.token;
  }
  return null;
}

export function signOutGoogle() {
  const token = getCachedToken();
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {}
  }
  cachedAccessToken = null;
  clearAuthToken();
  saveUserProfile(null);
}

/**
 * Drive API Helpers: working in appDataFolder
 */
async function driveApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getCachedToken();
  if (!token) throw new Error('Not authenticated to Google Drive');

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(endpoint, { ...options, headers });
  if (res.status === 401) {
    cachedAccessToken = null;
    clearAuthToken();
    throw new Error('Google Drive access expired. Please sign in again.');
  }
  return res;
}

/**
 * Find file in user's appDataFolder
 */
export async function findDriveFile(fileName: string): Promise<{ id: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name = '${fileName}' and 'appDataFolder' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`;
  const res = await driveApiFetch(url);
  if (!res.ok) throw new Error(`Drive search failed: ${res.statusText}`);
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * List all backup files in appDataFolder
 */
export async function listDriveBackups(): Promise<DriveBackupVersion[]> {
  const q = encodeURIComponent(`'appDataFolder' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=30`;
  const res = await driveApiFetch(url);
  if (!res.ok) throw new Error(`Failed to list backups: ${res.statusText}`);
  const data = await res.json();
  return (data.files || []).filter((f: any) => f.name.startsWith(DRIVE_BACKUP_PREFIX));
}

/**
 * Download file content by fileId
 */
export async function downloadDriveFile(fileId: string): Promise<AppData> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await driveApiFetch(url);
  if (!res.ok) throw new Error(`Failed to download data: ${res.statusText}`);
  return await res.json();
}

/**
 * Upload pocketpilot-data.json to Drive appDataFolder
 */
export async function uploadDataToDrive(data: AppData): Promise<string> {
  const existing = await findDriveFile(DRIVE_DATA_FILENAME);
  const boundary = '-------PocketPilotBoundary' + Math.random().toString(36).substring(2);
  const jsonContent = JSON.stringify(data, null, 2);

  if (existing?.id) {
    // Update existing file directly
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const res = await driveApiFetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonContent,
    });
    if (!res.ok) throw new Error(`Failed to update Drive file: ${res.statusText}`);
    return existing.id;
  } else {
    // Create new file inside appDataFolder
    const metadata = {
      name: DRIVE_DATA_FILENAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    };

    const multipartRequestBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${jsonContent}\r\n` +
      `--${boundary}--`;

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await driveApiFetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });
    if (!res.ok) throw new Error(`Failed to create Drive file: ${res.statusText}`);
    const created = await res.json();
    return created.id;
  }
}

/**
 * Create a daily versioned backup (e.g. pocketpilot-backup-20261110.json)
 * and prune backups older than 5.
 */
export async function createDailyBackupSnapshot(data: AppData) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const backupName = `${DRIVE_BACKUP_PREFIX}${todayStr}.json`;
    const existing = await findDriveFile(backupName);
    if (existing) return; // already snapshotted today

    const metadata = {
      name: backupName,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    };
    const boundary = '-------PocketPilotBackupBoundary' + Math.random().toString(36).substring(2);
    const jsonContent = JSON.stringify(data, null, 2);
    const multipartRequestBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${jsonContent}\r\n` +
      `--${boundary}--`;

    await driveApiFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartRequestBody,
    });

    // Prune backups beyond MAX_DRIVE_BACKUPS (5)
    const backups = await listDriveBackups();
    if (backups.length > MAX_DRIVE_BACKUPS) {
      const toDelete = backups.slice(MAX_DRIVE_BACKUPS);
      for (const old of toDelete) {
        await driveApiFetch(`https://www.googleapis.com/drive/v3/files/${old.id}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Daily backup snapshot skipped:', err);
  }
}

/**
 * Three-way Record Merger
 * Merges collections by unique record id, picking the newest updatedAt timestamp.
 * Preserves soft deletes so deleted records propagate accurately.
 */
function mergeCollection<T extends BaseRecord>(localArr: T[] = [], cloudArr: T[] = []): T[] {
  const map = new Map<string, T>();

  // Add local
  for (const item of localArr) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Compare with cloud
  for (const item of cloudArr) {
    if (!item || !item.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const localTime = new Date(existing.updatedAt || 0).getTime();
      const cloudTime = new Date(item.updatedAt || 0).getTime();
      if (cloudTime > localTime) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Merge entire AppData
 */
export function mergeAppData(localData: AppData, cloudData: AppData): AppData {
  return {
    schemaVersion: Math.max(localData.schemaVersion || 1, cloudData.schemaVersion || 1),
    updatedAt: new Date().toISOString(),
    expenses: mergeCollection(localData.expenses, cloudData.expenses),
    categories: mergeCollection(localData.categories, cloudData.categories),
    vehicles: mergeCollection(localData.vehicles, cloudData.vehicles),
    fuelLogs: mergeCollection(localData.fuelLogs, cloudData.fuelLogs),
    serviceLogs: mergeCollection(localData.serviceLogs, cloudData.serviceLogs),
    bikeReminders: mergeCollection(localData.bikeReminders, cloudData.bikeReminders),
    creditCards: mergeCollection(localData.creditCards, cloudData.creditCards),
    cardTransactions: mergeCollection(localData.cardTransactions, cloudData.cardTransactions),
    cardPayments: mergeCollection(localData.cardPayments, cloudData.cardPayments),
    supplyItems: mergeCollection(localData.supplyItems, cloudData.supplyItems),
    supplyHistory: mergeCollection(localData.supplyHistory, cloudData.supplyHistory),
    settings: {
      ...localData.settings,
      ...cloudData.settings,
      lastSyncedAt: new Date().toISOString(),
    }
  };
}

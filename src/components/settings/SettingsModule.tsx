import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cloud,
  LogOut,
  RefreshCw,
  Download,
  Upload,
  Sun,
  Moon,
  ShieldCheck,
  HardDrive,
  KeyRound,
  History,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileJson
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateDDMMMYY } from '../../utils/format';
import { exportAppDataJSON, readBackupJSONFile } from '../../utils/export';
import { listDriveBackups, downloadDriveFile } from '../../services/driveSync';
import { DriveBackupVersion } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { GOOGLE_CLIENT_ID } from '../../config/google';

export const SettingsModule: React.FC = () => {
  const {
    data,
    updateSettings,
    userProfile,
    logout,
    loginWithGoogle,
    triggerManualSync,
    syncStatus,
    lastSyncedTime,
    restoreFromData,
    resetToDefaultData
  } = useApp();

  const isDark = (data.settings?.theme || 'dark') === 'dark';

  const [driveBackups, setDriveBackups] = useState<DriveBackupVersion[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any | null>(null);

  const [customClientIdInput, setCustomClientIdInput] = useState(data.settings?.googleClientId || '');
  const [savedClientIdMsg, setSavedClientIdMsg] = useState(false);

  // Load available Drive snapshots if authenticated
  useEffect(() => {
    if (userProfile && syncStatus !== 'offline') {
      setLoadingBackups(true);
      listDriveBackups()
        .then(list => setDriveBackups(list))
        .catch(err => console.warn('Could not list drive backups:', err))
        .finally(() => setLoadingBackups(false));
    }
  }, [userProfile, syncStatus]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await readBackupJSONFile(file);
      setPendingRestoreData(parsed);
      setIsRestoreConfirmOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to parse backup file');
    }
    e.target.value = '';
  };

  const handleRestoreFromDrive = async (fileId: string) => {
    setRestoringBackupId(fileId);
    try {
      const cloudData = await downloadDriveFile(fileId);
      await restoreFromData(cloudData);
      alert('Backup restored successfully from Google Drive!');
    } catch (err: any) {
      alert(`Failed to restore backup: ${err.message}`);
    } finally {
      setRestoringBackupId(null);
    }
  };

  const handleSaveCustomClientId = () => {
    const trimmed = customClientIdInput.trim();
    updateSettings({ googleClientId: trimmed });
    localStorage.setItem('pocketpilot_custom_client_id', trimmed);
    setSavedClientIdMsg(true);
    setTimeout(() => setSavedClientIdMsg(false), 3000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-400" />
          Settings & Data Management
        </h2>
        <p className="text-xs text-slate-400">
          Google Drive backup versions, offline storage, theme, and data export
        </p>
      </div>

      {/* Section 1: User Account / Google Drive Sign-In */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Cloud className="w-4 h-4 text-teal-400" />
          Google Account & Sync
        </h3>

        {userProfile ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-3.5">
              {userProfile.picture ? (
                <img
                  src={userProfile.picture}
                  alt={userProfile.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-teal-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-teal-600/30 text-teal-300 flex items-center justify-center font-bold text-base">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-slate-100">{userProfile.name}</div>
                <div className="text-xs text-slate-400 font-mono">{userProfile.email}</div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Google Drive Synced (appDataFolder)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={triggerManualSync}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>

              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-gradient-to-r from-teal-950/40 to-slate-900 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-200">You are in Offline Mode</div>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                All data is currently stored in your browser's local storage. Connect your Gmail to auto-backup to Google Drive and sync across all your phones and computers.
              </p>
            </div>
            <button
              onClick={() => loginWithGoogle(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition shrink-0"
            >
              <Cloud className="w-4 h-4 text-teal-600" />
              <span>Connect Google Drive</span>
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Appearance & Preferences */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          Appearance & Preferences
        </h3>

        <div className="space-y-3">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <div className="text-xs font-semibold text-slate-200">Interface Theme</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Current: <strong className="capitalize">{data.settings?.theme || 'dark'} mode</strong> (deep navy/charcoal)
              </div>
            </div>
            <button
              onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-400" />}
              <span>Switch to {isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          {/* Supply Due Warning Days */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <div className="text-xs font-semibold text-slate-200">Supply Due Soon Threshold</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Number of days prior to due date to mark an item "Due Soon" (Blue)
              </div>
            </div>
            <select
              value={data.settings?.defaultDueWarningDays || 30}
              onChange={(e) => updateSettings({ defaultDueWarningDays: parseInt(e.target.value, 10) })}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono"
            >
              <option value={15}>15 days</option>
              <option value={30}>30 days (default)</option>
              <option value={45}>45 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Google Drive Versioned Backups (Keep up to 5) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Drive Version History (Daily Snapshots)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pocket Pilot automatically maintains up to 5 daily backup snapshots in your Drive
            </p>
          </div>
          {userProfile && (
            <button
              onClick={() => {
                setLoadingBackups(true);
                listDriveBackups().then(setDriveBackups).finally(() => setLoadingBackups(false));
              }}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
              title="Refresh backups list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {!userProfile ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-slate-950 border border-slate-800">
            Sign in with Google to view and restore from cloud backup snapshots.
          </div>
        ) : driveBackups.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-xl bg-slate-950 border border-slate-800">
            {loadingBackups ? 'Checking Google Drive...' : 'No older snapshot versions found yet. The daily snapshot is created automatically.'}
          </div>
        ) : (
          <div className="space-y-2">
            {driveBackups.map(backup => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileJson className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-slate-200 font-mono">{backup.name}</div>
                    <div className="text-[10px] text-slate-400">
                      Modified: {new Date(backup.modifiedTime).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  disabled={restoringBackupId === backup.id}
                  onClick={() => handleRestoreFromDrive(backup.id)}
                  className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {restoringBackupId === backup.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                  <span>Restore</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Manual Export / Import & Reset */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-400" />
          File Backup & Restore
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Download JSON */}
          <button
            onClick={() => exportAppDataJSON(data)}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition group text-left"
          >
            <div>
              <div className="text-xs font-bold text-slate-200">Download Backup (JSON)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Export all expenses, bike logs, cards, and supply items into a local file
              </p>
            </div>
            <Download className="w-4 h-4 text-teal-400 group-hover:scale-110 transition shrink-0 ml-2" />
          </button>

          {/* Restore JSON */}
          <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition group cursor-pointer text-left">
            <div>
              <div className="text-xs font-bold text-slate-200">Restore from Backup File</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Load a previously exported pocketpilot-backup.json file
              </p>
            </div>
            <Upload className="w-4 h-4 text-sky-400 group-hover:scale-110 transition shrink-0 ml-2" />
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Reset / Clear Data */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-400">Reset Demo Data</div>
            <div className="text-[11px] text-slate-500">
              Restore default starter sample categories, vehicle and supply items
            </div>
          </div>
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Section 5: Developer / OAuth Client ID settings */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            OAuth 2.0 Client ID Configuration
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">src/config/google.ts</span>
        </div>
        <p className="text-xs text-slate-400">
          Current Client ID from constant: <code className="text-teal-300">{GOOGLE_CLIENT_ID}</code>. You can paste your own client ID below to override without re-deploying:
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customClientIdInput}
            onChange={(e) => setCustomClientIdInput(e.target.value)}
            placeholder="Paste your Google OAuth Client ID here..."
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
          />
          <button
            onClick={handleSaveCustomClientId}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition shrink-0"
          >
            Save ID
          </button>
        </div>
        {savedClientIdMsg && (
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Client ID updated successfully!
          </p>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetToDefaultData}
        title="Reset to Starter Seed Data"
        message="Are you sure you want to restore the starter dataset? Any newly created expenses or logs will be replaced."
        confirmLabel="Reset Everything"
      />

      <ConfirmModal
        isOpen={isRestoreConfirmOpen}
        onClose={() => setIsRestoreConfirmOpen(false)}
        onConfirm={() => {
          if (pendingRestoreData) {
            restoreFromData(pendingRestoreData);
            setPendingRestoreData(null);
          }
        }}
        title="Restore from JSON Backup"
        message="Are you sure you want to load this backup file? It will replace current records and sync to your Google Drive."
        confirmLabel="Restore Data"
        isDestructive={false}
      />
    </div>
  );
};

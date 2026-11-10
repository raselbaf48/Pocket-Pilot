import React from 'react';
import {
  Compass,
  CheckCircle,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Sun,
  Moon,
  Cloud,
  User as UserIcon,
  HardDrive
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    syncStatus,
    lastSyncedTime,
    triggerManualSync,
    userProfile,
    isOfflineOnly,
    setIsAuthModalOpen,
    data,
    updateSettings,
    setActiveTab
  } = useApp();

  const isDark = (data.settings?.theme || 'dark') === 'dark';

  const toggleTheme = () => {
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  };

  const formatLastSync = (iso?: string | null) => {
    if (!iso) return 'Never';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Never';
    const now = new Date();
    const diffSec = Math.round((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 dark:bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20 group-hover:scale-105 transition">
            <Compass className="w-5 h-5 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-teal-300 via-teal-100 to-white bg-clip-text text-transparent">
                Pocket Pilot
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded">
                ৳ BDT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Personal Life & Expense Manager</p>
          </div>
        </div>

        {/* Sync Indicator & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync status capsule */}
          <div
            onClick={triggerManualSync}
            title={userProfile ? `Last synced: ${formatLastSync(lastSyncedTime)} (Click to sync now)` : 'Using local storage. Click to connect Drive'}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition select-none bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60"
          >
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                <span className="text-teal-300 hidden xs:inline">Syncing…</span>
              </>
            )}

            {syncStatus === 'synced' && (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">
                  <span className="hidden sm:inline">Synced </span>✓
                  <span className="text-[10px] text-slate-500 ml-1 hidden md:inline">
                    ({formatLastSync(lastSyncedTime)})
                  </span>
                </span>
              </>
            )}

            {syncStatus === 'offline' && (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 text-xs">Offline</span>
              </>
            )}

            {syncStatus === 'conflict' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-amber-300 text-xs">Conflict</span>
              </>
            )}

            {syncStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300 text-xs">Sync error</span>
              </>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </button>

          {/* User profile / Google sign in button */}
          {userProfile ? (
            <div
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition"
            >
              {userProfile.picture ? (
                <img
                  src={userProfile.picture}
                  alt={userProfile.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-teal-500/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-teal-600/30 text-teal-300 flex items-center justify-center text-xs font-bold">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-slate-200 hidden md:inline max-w-[100px] truncate">
                {userProfile.name.split(' ')[0]}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full transition"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Connect Drive</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

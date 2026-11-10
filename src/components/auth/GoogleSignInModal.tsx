import React, { useState } from 'react';
import { ShieldCheck, Cloud, RefreshCw, KeyRound, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { GOOGLE_CLIENT_ID } from '../../config/google';
import { getEffectiveClientId } from '../../services/driveSync';

export const GoogleSignInModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginWithGoogle, continueOfflineMode, data, updateSettings } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);
  const [customClientId, setCustomClientId] = useState(data.settings?.googleClientId || '');

  if (!isAuthModalOpen) return null;

  const currentClientId = getEffectiveClientId(customClientId);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(true);
    } catch (err: any) {
      setError(err?.message || 'Sign in could not be completed. You can continue offline anytime.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClientId = () => {
    updateSettings({ googleClientId: customClientId.trim() });
    localStorage.setItem('pocketpilot_custom_client_id', customClientId.trim());
    setShowClientIdConfig(false);
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      title="Connect with Google Drive"
      subtitle="Pocket Pilot Sync & Cloud Backup"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Onboarding Callout */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-500/30 text-teal-100">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 shrink-0 mt-0.5">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-teal-200">Private, Cross-Device Sync</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Your data is saved to your own Google Drive and syncs across all your devices when you sign in with the same Gmail.
              </p>
            </div>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="space-y-2.5 px-1 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict privacy: Uses Drive <code>appDataFolder</code>. Pocket Pilot cannot access your other Drive files.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Automatic cloud backups with daily snapshots and smart conflict merge.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Works 100% offline first. No middleman database or third-party servers.</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Google Sign-in Notice:</p>
              <p className="mt-0.5">{error}</p>
              <button
                type="button"
                onClick={() => setShowClientIdConfig(true)}
                className="mt-1.5 text-teal-300 hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                Configure custom OAuth Client ID
              </button>
            </div>
          </div>
        )}

        {/* Client ID Configuration toggle for developer/user customization */}
        {showClientIdConfig && (
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                OAuth 2.0 Client ID
              </label>
              <span className="text-[10px] text-slate-400">src/config/google.ts</span>
            </div>
            <input
              type="text"
              value={customClientId}
              onChange={(e) => setCustomClientId(e.target.value)}
              placeholder="e.g. 12345-abc.apps.googleusercontent.com"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500 font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClientIdConfig(false)}
                className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClientId}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-md font-medium"
              >
                Save Client ID
              </button>
            </div>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl shadow-lg transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-slate-700" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>

          {/* Continue offline button */}
          <button
            type="button"
            onClick={continueOfflineMode}
            className="w-full py-2.5 px-4 text-center text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition"
          >
            Continue offline (without login)
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-slate-500">
            Offline data is stored locally in your browser. When you sign in later, all your existing records will be synced seamlessly to your Google Drive.
          </p>
        </div>
      </div>
    </Modal>
  );
};

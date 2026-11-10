import React from 'react';
import { GitMerge, Cloud, HardDrive, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { formatDateDDMMMYY } from '../../utils/format';
import { useApp } from '../../context/AppContext';

export const ConflictDialog: React.FC = () => {
  const { conflictState, resolveConflict } = useApp();

  if (!conflictState.isOpen) return null;

  const localTimeStr = conflictState.localUpdatedAt
    ? `${formatDateDDMMMYY(conflictState.localUpdatedAt)} at ${new Date(conflictState.localUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Unknown';

  const cloudTimeStr = conflictState.cloudUpdatedAt
    ? `${formatDateDDMMMYY(conflictState.cloudUpdatedAt)} at ${new Date(conflictState.cloudUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Unknown';

  return (
    <Modal
      isOpen={conflictState.isOpen}
      onClose={() => resolveConflict('merge')}
      title="Data Conflict Detected"
      subtitle="Both this device and your Google Drive have been updated since the last sync."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Choose which data to keep, or merge them to keep all your latest changes across both devices without losing any records.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-1">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              <span>This Device</span>
            </div>
            <p className="text-slate-400 text-[11px]">{localTimeStr}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-1">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Drive</span>
            </div>
            <p className="text-slate-400 text-[11px]">{cloudTimeStr}</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {/* Merge option - recommended */}
          <button
            onClick={() => resolveConflict('merge')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-left transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 group-hover:scale-110 transition">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-teal-300 flex items-center gap-2">
                  Merge (Recommended)
                  <span className="text-[10px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded font-mono">Smart</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Combine both versions, keeping the newest edit of each record
                </p>
              </div>
            </div>
          </button>

          {/* Cloud data option */}
          <button
            onClick={() => resolveConflict('cloud')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-left transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Use Cloud Data
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Overwrite this device with data stored in Google Drive
                </p>
              </div>
            </div>
          </button>

          {/* Device data option */}
          <button
            onClick={() => resolveConflict('local')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-left transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-700/40 text-slate-300 group-hover:scale-110 transition">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Use This Device's Data
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Overwrite Google Drive with data on this device
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
};

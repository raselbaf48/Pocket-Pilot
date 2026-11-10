import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex items-start gap-3 py-1">
        <div className={`p-2.5 rounded-xl ${isDestructive ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'} shrink-0`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-sm text-slate-300 leading-relaxed">
          {message}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-sm transition ${
            isDestructive
              ? 'bg-red-600 hover:bg-red-500 active:scale-95'
              : 'bg-teal-600 hover:bg-teal-500 active:scale-95'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

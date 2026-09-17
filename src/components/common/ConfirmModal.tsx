import React from 'react';
import { AlertTriangle, Trash2, X, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-5 h-5 text-rose-600" />,
          iconBg: 'bg-rose-100',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
          border: 'border-rose-200',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-100',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
          border: 'border-amber-200',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-100',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-200',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full my-8 animate-in zoom-in-95 p-6 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${style.iconBg}`}>
            {style.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${style.btnBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

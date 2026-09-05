import React, { useEffect } from 'react';
import { XIcon } from './Icons';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgStyles = {
    success: 'bg-emerald-600 text-white shadow-emerald-900/20',
    error: 'bg-rose-600 text-white shadow-rose-900/20',
    info: 'bg-slate-800 text-white shadow-slate-900/20',
  };

  const icons = {
    success: '✅',
    error: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-lg shadow-lg text-xs font-medium transition-all transform translate-y-0 ${
        bgStyles[toast.type]
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span>{icons[toast.type]}</span>
        <span>{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Cerrar notificación"
      >
        <XIcon className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  );
};

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global event bus for non-React contexts or fast dispatch
type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  show: (message: string, type: ToastType = 'info', durationMs = 4000) => {
    const item: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      type,
      durationMs,
    };
    listeners.forEach((l) => l(item));
  },
  success: (message: string) => toast.show(message, 'success', 3500),
  error: (message: string) => toast.show(message, 'error', 5000),
  info: (message: string) => toast.show(message, 'info', 3500),
  warning: (message: string) => toast.show(message, 'warning', 4500),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => [...prev, item]);
    const timer = setTimeout(() => {
      removeToast(item.id);
    }, item.durationMs || 4000);
    return () => clearTimeout(timer);
  }, [removeToast]);

  useEffect(() => {
    listeners.add(addToast);
    return () => {
      listeners.delete(addToast);
    };
  }, [addToast]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 4000) => {
      toast.show(message, type, durationMs);
    },
    []
  );

  const contextValue: ToastContextValue = {
    showToast,
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
    warning: (msg) => showToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
                isSuccess
                  ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40'
                  : isError
                  ? 'bg-rose-950/90 text-rose-100 border-rose-500/40'
                  : isWarning
                  ? 'bg-amber-950/90 text-amber-100 border-amber-500/40'
                  : 'bg-stone-900/90 text-stone-100 border-stone-700'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-amber-300" />}
              </div>
              <div className="flex-1 text-xs leading-relaxed font-medium">
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-white/50 hover:text-white transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: toast.show,
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
    };
  }
  return ctx;
}

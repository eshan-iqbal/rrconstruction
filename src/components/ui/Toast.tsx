'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    show: (item: Omit<ToastItem, 'id'>) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ type, title, message, duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title: string = 'Success', duration?: number) => {
      show({ type: 'success', title, message, duration });
    },
    [show]
  );

  const error = useCallback(
    (message: string, title: string = 'Error', duration?: number) => {
      show({ type: 'error', title, message, duration });
    },
    [show]
  );

  const info = useCallback(
    (message: string, title: string = 'Notice', duration?: number) => {
      show({ type: 'info', title, message, duration });
    },
    [show]
  );

  const warning = useCallback(
    (message: string, title: string = 'Warning', duration?: number) => {
      show({ type: 'warning', title, message, duration });
    },
    [show]
  );

  const getToastClasses = (type: ToastType) => {
    if (isLight) {
      switch (type) {
        case 'success':
          return 'bg-white/95 border-emerald-500/40 text-zinc-900 shadow-xl shadow-emerald-600/10';
        case 'error':
          return 'bg-white/95 border-rose-500/40 text-zinc-900 shadow-xl shadow-rose-600/10';
        case 'warning':
          return 'bg-white/95 border-amber-500/40 text-zinc-900 shadow-xl shadow-amber-600/10';
        case 'info':
        default:
          return 'bg-white/95 border-zinc-300 text-zinc-900 shadow-xl shadow-zinc-600/10';
      }
    } else {
      switch (type) {
        case 'success':
          return 'bg-zinc-900/95 border-emerald-500/40 text-zinc-100 shadow-2xl shadow-emerald-950/40';
        case 'error':
          return 'bg-zinc-900/95 border-rose-500/40 text-zinc-100 shadow-2xl shadow-rose-950/40';
        case 'warning':
          return 'bg-zinc-900/95 border-amber-500/40 text-zinc-100 shadow-2xl shadow-amber-950/40';
        case 'info':
        default:
          return 'bg-zinc-900/95 border-zinc-700 text-zinc-100 shadow-2xl shadow-zinc-950/40';
      }
    }
  };

  return (
    <ToastContext.Provider value={{ toast: { success, error, info, warning, show }, removeToast }}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="assertive"
        className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-3 sm:p-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl backdrop-blur-xl border transition-all animate-in fade-in slide-in-from-top-4 duration-200 ${getToastClasses(
              t.type
            )}`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <CheckCircle2 className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              )}
              {t.type === 'error' && (
                <AlertCircle className={`w-5 h-5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              )}
              {t.type === 'warning' && (
                <AlertTriangle className={`w-5 h-5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              )}
              {t.type === 'info' && (
                <Info className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {t.title && (
                <h4
                  className={`text-xs font-bold font-mono tracking-tight capitalize ${
                    isLight ? 'text-zinc-900' : 'text-white'
                  }`}
                >
                  {t.title}
                </h4>
              )}
              <p
                className={`text-xs font-sans mt-0.5 leading-snug break-words ${
                  isLight ? 'text-zinc-600' : 'text-zinc-300'
                }`}
              >
                {t.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className={`p-1 rounded-lg transition-colors shrink-0 ${
                isLight
                  ? 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}


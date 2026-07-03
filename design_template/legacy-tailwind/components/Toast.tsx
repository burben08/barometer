import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from './utils';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

const kindStyles: Record<ToastKind, { bg: string; icon: React.ReactNode }> = {
  success: { bg: 'bg-success-pastel', icon: <CheckCircle2 size={20} /> },
  error: { bg: 'bg-danger text-white', icon: <XCircle size={20} /> },
  info: { bg: 'bg-tertiary-pastel', icon: <Info size={20} /> },
};

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** Read this to fire toasts: const toast = useToast(); toast('Check-in logged!', 'success'); */
export const useToast = () => useContext(ToastContext);

/** Wrap your app root once: <ToastProvider><App /></ToastProvider> */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 left-4 right-4 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-control border-regular border-border shadow-brutal-md font-bold font-body text-sm max-w-sm animate-slide-up',
              kindStyles[t.kind].bg,
            )}
          >
            {kindStyles[t.kind].icon}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

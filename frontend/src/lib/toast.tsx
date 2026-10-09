import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** How long a toast stays on screen before it dismisses itself. */
export const TOAST_DURATION = 4000;

export type ToastTone = 'info' | 'success' | 'danger';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** Toasts with the same id replace each other, so one event never shows twice. */
  id?: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  show: (message: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, { tone = 'info', id = `toast-${nextId.current++}` }: ToastOptions = {}) => {
      clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_DURATION),
      );
      setToasts((current) => [...current.filter((t) => t.id !== id), { id, message, tone }]);
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, show, dismiss }),
    [toasts, show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol className="toasts" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <li key={t.id} className={`toast toast-${t.tone}`}>
            <span>{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              ×
            </button>
          </li>
        ))}
      </ol>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

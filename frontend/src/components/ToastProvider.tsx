import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type ToastVariant = 'error' | 'success';

type Toast = {
  id: number;
  variant: ToastVariant;
  message: string;
};

type ShowToastInput = {
  variant?: ToastVariant;
  message: string;
};

type ToastContextValue = {
  showToast: (input: ShowToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback(({ variant = 'error', message }: ShowToastInput) => {
    setToast({ id: ++nextToastId, variant, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <ToastBanner
          key={toast.id}
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastBanner({
  variant,
  message,
  onDismiss,
}: {
  variant: ToastVariant;
  message: string;
  onDismiss: () => void;
}) {
  const styles =
    variant === 'error'
      ? 'bg-red-50 text-red-900 ring-red-200'
      : 'bg-emerald-50 text-emerald-900 ring-emerald-200';

  return (
    <div
      role="alert"
      className={`fixed left-1/2 top-4 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${styles}`}
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-1 py-0.5 text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

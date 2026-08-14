import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 4;
const AUTO_DISMISS_MS = 5000;

const KIND_META: Record<ToastKind, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: '#86b298', bg: 'rgba(134,178,152,0.12)' },
  error:   { icon: AlertCircle,  color: '#d09090', bg: 'rgba(208,144,144,0.12)' },
  info:    { icon: Info,         color: '#9184d9', bg: 'rgba(145,132,217,0.12)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => {
      const next = [...prev, { id, kind, message }];
      // máximo 4 visibles; descarta el más viejo si entra uno de más
      if (next.length > MAX_TOASTS) {
        const dropped = next.shift();
        if (dropped) {
          const t = timers.current.get(dropped.id);
          if (t) clearTimeout(t);
          timers.current.delete(dropped.id);
        }
      }
      return next;
    });

    // los de error no se auto-descartan: el usuario los cierra a mano
    if (kind !== 'error') {
      const timer = window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    }
  }, [dismiss]);

  const value: ToastContextValue = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[80] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const meta = KIND_META[t.kind];
            const Icon = meta.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="card pointer-events-auto flex items-start gap-2.5 p-3 shadow-lg"
                style={{ borderColor: meta.color + '40' }}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <Icon size={13} />
                </span>
                <p className="flex-1 text-sm text-metal-100 pt-0.5">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 p-1 rounded-lg text-metal-500 hover:text-metal-200 hover:bg-tint/5 transition-colors"
                  aria-label="Cerrar notificación"
                >
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

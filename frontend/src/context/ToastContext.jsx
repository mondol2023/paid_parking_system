/* eslint-disable react-refresh/only-export-components --
   A provider and its consumer hook belong in one module; the cost is that this
   file re-mounts rather than hot-reloading when it changes. */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { toastItem } from '@/lib/motion';
import { cn } from '@/lib/cn';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, ring: 'border-open/40', mark: 'text-open' },
  error: { icon: TriangleAlert, ring: 'border-alert/40', mark: 'text-alert' },
  info: { icon: Info, ring: 'border-line-strong', mark: 'text-muted' },
};

/**
 * Replaces the six alert() calls the old pages used for every outcome. One
 * provider, one live region, one animated stack.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, { tone = 'info', duration = 4500 } = {}) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, opts) => push(message, { ...opts, tone: 'success' }),
      error: (message, opts) => push(message, { ...opts, tone: 'error', duration: 6000 }),
      info: (message, opts) => push(message, { ...opts, tone: 'info' }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end sm:bottom-auto"
      >
        <AnimatePresence initial={false}>
          {toasts.map(({ id, message, tone }) => {
            const { icon: Icon, ring, mark } = TONES[tone] ?? TONES.info;
            return (
              <motion.div
                key={id}
                layout
                variants={toastItem}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface p-3 shadow-card',
                  ring,
                )}
              >
                <Icon size={18} className={cn('mt-0.5 shrink-0', mark)} aria-hidden="true" />
                <p className="flex-1 text-sm leading-snug text-ink">{message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(id)}
                  aria-label="Dismiss notification"
                  className="-m-1 rounded p-1 text-muted transition-colors hover:text-ink"
                >
                  <X size={15} aria-hidden="true" />
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
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

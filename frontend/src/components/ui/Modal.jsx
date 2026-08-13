import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { modalBackdrop, modalPanel } from '@/lib/motion';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ open, onClose, title, description, size = 'md', children, footer }) {
  const panelRef = useRef(null);
  const titleId = useId();

  // Escape to close, and hold the background still while the dialog is up.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    // Move focus in so the keyboard user is not left behind on the trigger.
    const focusTarget = panelRef.current?.querySelector(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            {...modalBackdrop}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            variants={modalPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-line bg-surface shadow-card',
              SIZES[size],
            )}
          >
            {title && (
              <div className="flex items-start justify-between gap-4 border-b border-line p-5">
                <div>
                  <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-m-1 rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="p-5">{children}</div>

            {footer && <div className="flex justify-end gap-2 border-t border-line p-5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

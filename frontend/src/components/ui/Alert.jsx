import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';

const TONES = {
  alert: { ring: 'border-alert/35 bg-alert-soft text-alert', Icon: AlertTriangle },
  info: { ring: 'border-line bg-surface-2 text-muted', Icon: Info },
};

/**
 * Form-level message (a DRF non_field_error, a 409 conflict). Field-level errors
 * belong on the field itself; this is only for what has no field to sit under.
 */
export function Alert({ message, tone = 'alert', className }) {
  const { ring, Icon } = TONES[tone] ?? TONES.alert;

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: DURATION.base, ease: EASE }}
          className="overflow-hidden"
        >
          <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm', ring, className)}>
            <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

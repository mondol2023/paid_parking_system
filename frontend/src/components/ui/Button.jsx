import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';

/**
 * OCP: styles resolve from these lookups. Adding a variant is adding a key —
 * never an edit to the JSX below.
 *
 * Accent is the signage yellow and is deliberately scarce: primary actions only.
 */
const VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:brightness-105 active:brightness-95 shadow-card',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-alert text-white hover:brightness-110',
  quiet: 'bg-surface-2 text-ink hover:bg-line',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
};

const BASE =
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50 select-none';

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={spring}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  );
});

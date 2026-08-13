import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { staggerChild, staggerParent } from '@/lib/motion';
import { Button } from './Button';

export function Spinner({ size = 18, className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex text-muted', className)}>
      <Loader2 size={size} className="animate-spin" aria-hidden="true" />
    </span>
  );
}

/** A shape-matched placeholder, so content arriving does not shift the layout. */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} aria-hidden="true" />;
}

export function SkeletonGrid({ count = 6, className = 'h-36' }) {
  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.div key={i} variants={staggerChild}>
          <Skeleton className={className} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface-2 text-muted">
          <Icon size={20} aria-hidden="true" />
        </span>
      )}
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-alert/30 bg-alert-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-ink">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

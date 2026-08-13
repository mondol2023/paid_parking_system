import { cn } from '@/lib/cn';

/**
 * OCP again: tone is a key, not a branch. `Badge` is the neutral chip;
 * `StatusPill` layers the domain vocabulary (open/taken/paid/due) on top so the
 * same colour never means two things across screens.
 */
const TONES = {
  neutral: 'bg-surface-2 text-muted border-line',
  open: 'bg-open-soft text-open border-open/30',
  taken: 'bg-taken-soft text-taken border-taken/30',
  alert: 'bg-alert-soft text-alert border-alert/30',
  accent: 'bg-accent-soft text-ink border-accent/40',
};

export function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const STATUS_TONES = {
  available: { tone: 'open', label: 'Available' },
  occupied: { tone: 'taken', label: 'Occupied' },
  active: { tone: 'open', label: 'Parked' },
  completed: { tone: 'neutral', label: 'Completed' },
  cancelled: { tone: 'taken', label: 'Cancelled' },
  paid: { tone: 'open', label: 'Paid' },
  due: { tone: 'alert', label: 'Payment due' },
};

export function StatusPill({ status, label, className }) {
  const config = STATUS_TONES[status] ?? { tone: 'neutral', label: status };
  return (
    <Badge tone={config.tone} className={className}>
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          config.tone === 'open' && 'bg-open',
          config.tone === 'alert' && 'bg-alert',
          config.tone === 'taken' && 'bg-taken',
          config.tone === 'neutral' && 'bg-muted',
          config.tone === 'accent' && 'bg-accent',
        )}
      />
      {label ?? config.label}
    </Badge>
  );
}

import { cn } from '@/lib/cn';

/**
 * The look of every text-like control. Kept out of Field.jsx so that file
 * exports components only (and so a bare <input> — the search box — can dress
 * itself identically without going through Field).
 */
export const controlClass = (invalid) =>
  cn(
    'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink transition-colors',
    'placeholder:text-muted/70 disabled:opacity-60',
    invalid ? 'border-alert' : 'border-line-strong hover:border-muted',
  );

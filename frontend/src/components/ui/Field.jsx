import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { DURATION, EASE } from '@/lib/motion';
import { controlClass } from './controlClass';

/**
 * LSP: every field component below takes the same {name, label, error, hint}
 * contract plus native props, so a form can render them from a config array and
 * swap one type for another without touching the form.
 */

export function Field({ name, label, error, hint, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={name} className="label-caps">
          {label}
          {required && <span className="text-alert"> *</span>}
        </label>
      )}
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${name}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE }}
            className="text-xs text-alert"
          >
            {error}
          </motion.p>
        ) : (
          hint && (
            <p key="hint" className="text-xs text-muted">
              {hint}
            </p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

export function Input({ name, label, error, hint, required, className, ...props }) {
  return (
    <Field name={name} label={label} error={error} hint={hint} required={required} className={className}>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={controlClass(error)}
        {...props}
      />
    </Field>
  );
}

export function Select({ name, label, error, hint, required, options = [], placeholder, className, ...props }) {
  return (
    <Field name={name} label={label} error={error} hint={hint} required={required} className={className}>
      <select
        id={name}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={cn(controlClass(error), 'appearance-none pr-8')}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Textarea({ name, label, error, hint, required, className, rows = 3, ...props }) {
  return (
    <Field name={name} label={label} error={error} hint={hint} required={required} className={className}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={cn(controlClass(error), 'resize-y')}
        {...props}
      />
    </Field>
  );
}

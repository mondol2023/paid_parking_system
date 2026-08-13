import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { SquareParking } from 'lucide-react';
import { EASE_OUT, staggerChild, staggerParent } from '@/lib/motion';

/**
 * Shared chrome for the two auth screens: a painted-lot brand panel on the left
 * from md up, the form on the right. Both pages render through this so they can
 * never drift apart.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh bg-ground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-surface-2 p-10 lg:flex lg:flex-col lg:justify-between">
        {/* Bay markings — the lot floor, drawn rather than photographed. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.35]">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="bays" width="120" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
                <rect x="0" y="0" width="120" height="200" fill="none" />
                <path d="M0 0 V200 M120 0 V200 M0 100 H120" stroke="var(--line-strong)" strokeWidth="2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bays)" />
          </svg>
        </div>

        <Link to="/" className="relative flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <SquareParking size={19} aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">Parkline</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="relative max-w-sm"
        >
          <p className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-ink">
            Find a bay, park, pay.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Live slot availability across every lot, metered by the hour and settled from one place.
          </p>
        </motion.div>

        <div className="relative flex gap-6">
          {[
            { value: 'Live', label: 'Slot status' },
            { value: 'Hourly', label: 'Metered rates' },
            { value: '3 ways', label: 'To pay' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-xl font-semibold text-ink">{stat.value}</p>
              <p className="label-caps mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <motion.div variants={staggerParent} initial="initial" animate="animate" className="w-full max-w-sm">
          <motion.div variants={staggerChild} className="mb-7 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-ink">
              <SquareParking size={20} aria-hidden="true" />
            </span>
          </motion.div>

          <motion.h1
            variants={staggerChild}
            className="font-display text-3xl font-semibold tracking-tight text-ink"
          >
            {title}
          </motion.h1>
          <motion.p variants={staggerChild} className="mt-1.5 text-sm text-muted">
            {subtitle}
          </motion.p>

          <motion.div variants={staggerChild} className="mt-7">
            {children}
          </motion.div>

          {footer && (
            <motion.p variants={staggerChild} className="mt-6 text-sm text-muted">
              {footer}
            </motion.p>
          )}
        </motion.div>
      </main>
    </div>
  );
}

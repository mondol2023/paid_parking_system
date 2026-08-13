import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { staggerChild, staggerParent } from '@/lib/motion';

export default function NotFound() {
  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center"
    >
      <motion.p
        variants={staggerChild}
        className="font-display text-7xl font-semibold tracking-tight text-ink"
        aria-hidden="true"
      >
        404
      </motion.p>
      <motion.h1 variants={staggerChild} className="mt-2 font-display text-xl font-semibold tracking-tight text-ink">
        No bay at this address
      </motion.h1>
      <motion.p variants={staggerChild} className="mt-2 text-sm text-muted">
        The page you asked for does not exist. It may have been moved, or the link may be wrong.
      </motion.p>
      <motion.div variants={staggerChild} className="mt-6">
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink transition-[filter] hover:brightness-105"
        >
          Back to the dashboard
        </Link>
      </motion.div>
    </motion.div>
  );
}

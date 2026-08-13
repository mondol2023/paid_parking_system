import { AnimatePresence, motion } from 'motion/react';
import { fade } from '@/lib/motion';
import { ErrorState, SkeletonGrid } from '@/components/ui/Feedback';

/**
 * DRY: the loading → error → empty → content ladder every page repeated by hand.
 * Pass a `skeleton` when the shape of the page is not a card grid.
 *
 * The crossfade is what makes a refetch feel like an update rather than a
 * flash of the whole page rebuilding.
 */
export function AsyncBoundary({ loading, error, empty, onRetry, skeleton, children }) {
  const phase = loading ? 'loading' : error ? 'error' : empty ? 'empty' : 'content';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={phase} {...fade}>
        {phase === 'loading' && (skeleton ?? <SkeletonGrid />)}
        {phase === 'error' && <ErrorState message={error} onRetry={onRetry} />}
        {phase === 'empty' && empty}
        {phase === 'content' && children}
      </motion.div>
    </AnimatePresence>
  );
}

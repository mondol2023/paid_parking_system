import { motion } from 'motion/react';
import { pageTransition } from '@/lib/motion';

/**
 * Wraps a page so route changes fade/rise instead of snapping. The key lives on
 * the <Routes> element in App.jsx (AnimatePresence needs a changing key at that
 * level); this component only owns the visual part.
 */
export function Page({ children }) {
  return <motion.div {...pageTransition}>{children}</motion.div>;
}

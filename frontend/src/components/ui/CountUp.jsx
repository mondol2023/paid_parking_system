import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { EASE_OUT } from '@/lib/motion';
import { money } from '@/lib/format';

/**
 * A total that counts up to its final figure. Imperative `animate()` sits
 * outside MotionConfig's reducedMotion, so the preference is checked here.
 */
export function CountUp({ value, format = money, duration = 0.7, className }) {
  const current = useMotionValue(0);
  const text = useTransform(current, (v) => format(v));

  useEffect(() => {
    const target = Number(value) || 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      current.set(target);
      return undefined;
    }
    const controls = animate(current, target, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, duration, current]);

  return <motion.span className={className}>{text}</motion.span>;
}

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { staggerChild, staggerParent } from '@/lib/motion';

const SIZE_LABEL = { small: 'S', medium: 'M', large: 'L' };

/**
 * The lot floor. Every tile is a real <button>, so tabbing through the grid and
 * hitting Enter books a bay without a mouse.
 */
export function SlotGrid({ slots, selectedId, onSelect }) {
  return (
    <motion.ul
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5"
    >
      {slots.map((slot) => {
        const selected = slot.id === selectedId;
        const free = slot.is_available;

        return (
          <motion.li key={slot.id} variants={staggerChild} layout>
            <motion.button
              type="button"
              disabled={!free}
              onClick={() => onSelect(slot)}
              whileHover={free ? { y: -2 } : undefined}
              whileTap={free ? { scale: 0.97 } : undefined}
              aria-pressed={selected}
              aria-label={`Bay ${slot.slot_number}, ${slot.size}, ${free ? 'available' : 'occupied'}`}
              className={cn(
                'relative flex w-full flex-col items-center gap-0.5 rounded-lg border px-2 py-3 transition-colors',
                free
                  ? 'border-line-strong bg-surface hover:border-accent'
                  : 'cursor-not-allowed border-line bg-surface-2 opacity-60',
                selected && 'border-accent',
              )}
            >
              {selected && (
                // The same layoutId lands on the confirmation panel, so the tile
                // visibly travels there instead of a new card appearing.
                <motion.span
                  layoutId="slot-selection"
                  className="absolute inset-0 rounded-lg bg-accent-soft ring-2 ring-accent"
                />
              )}
              <span className="relative font-display text-lg font-semibold leading-none tracking-tight text-ink">
                {slot.slot_number}
              </span>
              <span className="relative label-caps">
                {SIZE_LABEL[slot.size] ?? slot.size} · {free ? 'Open' : 'Taken'}
              </span>
            </motion.button>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

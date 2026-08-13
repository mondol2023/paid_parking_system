import { useEffect, useState } from 'react';

/**
 * A ticking clock for live elapsed-time and running-cost displays. One timer per
 * list, not one per row — the caller passes `now` down to its children.
 */
export function useNow(intervalMs = 1000, active = true) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);

  return now;
}

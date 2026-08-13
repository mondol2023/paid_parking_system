import { useEffect, useState } from 'react';

/** Trails `value` by `delay` ms. Vehicle search fired one request per keystroke. */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

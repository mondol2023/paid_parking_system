import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/errors';

/**
 * The read half of every screen: {data, loading, error, refetch}. Each page used
 * to hand-roll this quadruple with its own useState trio and no cancellation.
 *
 * `fetcher` must be stable (useCallback in the caller) — it is the dependency
 * that decides when a refetch happens.
 */
export function useResource(fetcher, { initialData = null, enabled = true } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  // Guards against a slow first request resolving after a fast second one and
  // overwriting fresher data.
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current && id === requestId.current) setData(result);
    } catch (err) {
      if (mounted.current && id === requestId.current) setError(errorMessage(err));
    } finally {
      if (mounted.current && id === requestId.current) setLoading(false);
    }
  }, [fetcher, enabled]);

  useEffect(() => {
    // Fetching on mount is exactly the "synchronise with an external system"
    // case the rule exists to narrow; the setState happens after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  return { data, loading, error, refetch: run, setData };
}

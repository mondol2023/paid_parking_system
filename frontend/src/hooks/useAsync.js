import { useCallback, useState } from 'react';
import { errorMessage } from '@/lib/errors';

/**
 * The write half: a one-shot action with its own pending flag, for buttons that
 * must disable while a POST is in flight (book, checkout, pay, delete).
 *
 * Rethrows so the caller can still branch on the error — it only owns the flag.
 */
export function useAsync(action) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setPending(true);
      setError(null);
      try {
        return await action(...args);
      } catch (err) {
        setError(errorMessage(err));
        throw err;
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending, error, clearError: () => setError(null) };
}

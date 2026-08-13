import { useCallback, useState } from 'react';
import { errorMessage, fieldErrors } from '@/lib/errors';

/**
 * Maps a DRF error response onto a react-hook-form. Field keys the form knows
 * about land on their input; anything else (non_field_errors, an unknown field,
 * a 500) becomes the form-level banner, so no server message is ever silently
 * swallowed.
 *
 * `fields` is the list of names the form actually renders.
 */
export function useServerErrors(setError, fields = []) {
  const [formError, setFormError] = useState(null);
  // A stable primitive: callers pass a fresh array literal on every render.
  const fieldKey = fields.join(',');

  const apply = useCallback(
    (error) => {
      const known = new Set(fieldKey ? fieldKey.split(',') : []);
      const map = fieldErrors(error);
      const entries = Object.entries(map);
      const unmatched = [];

      entries.forEach(([field, message]) => {
        if (known.has(field)) setError(field, { type: 'server', message });
        else unmatched.push(message);
      });

      setFormError(unmatched.length ? unmatched.join(' ') : entries.length ? null : errorMessage(error));
    },
    [setError, fieldKey],
  );

  const clear = useCallback(() => setFormError(null), []);

  return { formError, apply, clear };
}

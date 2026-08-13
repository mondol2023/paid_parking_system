import { useCallback } from 'react';
import { vehicleService } from '@/api/services';
import { useResource } from '@/hooks/useResource';

/**
 * The user's vehicles. Both the vehicles page and the booking panel read from
 * here — the booking panel's dropdown used to be a hardcoded fake option.
 *
 * `search` and `type` are already-debounced values from the caller.
 */
export function useVehicles({ search = '', type = '' } = {}) {
  const fetcher = useCallback(
    () => (search.trim() ? vehicleService.search(search.trim()) : vehicleService.list(type || undefined)),
    [search, type],
  );

  const { data, loading, error, refetch } = useResource(fetcher, { initialData: [] });

  return { vehicles: data ?? [], loading, error, refetch };
}

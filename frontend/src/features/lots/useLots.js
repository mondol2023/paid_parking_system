import { useCallback } from 'react';
import { lotService } from '@/api/services';
import { useResource } from '@/hooks/useResource';
import { useGeolocation } from '@/hooks/useGeolocation';

/**
 * Lots, sorted by distance when the browser will say where we are and plainly
 * otherwise. The old page only ever called /nearest/, so a denied permission
 * prompt left it blank forever with nothing on screen to explain why.
 */
export function useLots({ radius = 10 } = {}) {
  const { status, coords, message, locate } = useGeolocation();

  // Read the two numbers out of `coords` so the fetcher depends on primitives
  // rather than on an object identity that changes on every position update.
  const lat = coords?.lat;
  const lng = coords?.lng;
  const located = status === 'ready' && lat != null && lng != null;
  // Hold the request until geolocation has resolved one way or the other,
  // otherwise we'd fetch the unsorted list and immediately refetch the sorted one.
  const settled = status !== 'idle' && status !== 'locating';

  const fetcher = useCallback(
    () => (located ? lotService.nearest(lat, lng, { radius }) : lotService.list()),
    [located, lat, lng, radius],
  );

  const { data, loading, error, refetch } = useResource(fetcher, { initialData: [], enabled: settled });

  return {
    lots: data ?? [],
    loading: loading || !settled,
    error,
    refetch,
    /** 'distance' | 'name' — what the current order actually means. */
    sortedBy: located ? 'distance' : 'name',
    geo: { status, message, retry: locate },
  };
}

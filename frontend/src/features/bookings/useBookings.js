import { useCallback } from 'react';
import { bookingService } from '@/api/services';
import { useResource } from '@/hooks/useResource';

/**
 * Active stays only — that is what GET /bookings/ returns. A checked-out
 * booking disappears from here, which is why the payments page exists.
 */
export function useBookings() {
  const fetcher = useCallback(() => bookingService.list(), []);
  const { data, loading, error, refetch } = useResource(fetcher, { initialData: [] });

  return { bookings: data ?? [], loading, error, refetch };
}

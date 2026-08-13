import { useCallback, useMemo } from 'react';
import { paymentService } from '@/api/services';
import { useResource } from '@/hooks/useResource';

/**
 * Payment history, split the way the page reads it. `/bookings/` only returns
 * active stays, so once a booking is checked out this is the only place an
 * unpaid balance is still reachable.
 */
export function usePayments() {
  const fetcher = useCallback(() => paymentService.history(), []);
  const { data, loading, error, refetch } = useResource(fetcher, { initialData: [] });

  const payments = useMemo(() => data ?? [], [data]);

  return useMemo(() => {
    const due = payments.filter((p) => !p.paid);
    const settled = payments.filter((p) => p.paid);
    const totalDue = due.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    return { payments, due, settled, totalDue, loading, error, refetch };
  }, [payments, loading, error, refetch]);
}

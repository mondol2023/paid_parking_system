import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { SquareParking } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { staggerParent } from '@/lib/motion';
import { errorMessage } from '@/lib/errors';
import { bookingService } from '@/api/services';
import { useNow } from '@/hooks/useNow';
import { useToast } from '@/context/ToastContext';
import { useBookings } from '@/features/bookings/useBookings';
import { BookingCard } from '@/features/bookings/BookingCard';
import { CheckoutSummary } from '@/features/bookings/CheckoutSummary';
import { usePayments } from '@/features/payments/usePayments';
import { PayModal } from '@/features/payments/PayModal';

export default function Bookings() {
  const toast = useToast();
  const navigate = useNavigate();

  const { bookings, loading, error, refetch } = useBookings();
  // The pending Payment row carries the estimated amount for an active stay —
  // the booking payload itself has no rate to compute one from.
  const { payments, refetch: refetchPayments } = usePayments();

  const now = useNow(1000, bookings.length > 0);

  const [checkingOut, setCheckingOut] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [paying, setPaying] = useState(false);

  const estimates = useMemo(
    () => new Map(payments.filter((p) => !p.paid).map((p) => [p.booking, Number(p.amount)])),
    [payments],
  );

  const checkout = async (booking) => {
    setCheckingOut(booking.id);
    try {
      const result = await bookingService.checkout(booking.id);
      setReceipt(result);
      refetch();
      refetchPayments();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not check out. Try again.'));
    } finally {
      setCheckingOut(null);
    }
  };

  const closeReceipt = () => {
    const unpaid = receipt && !receipt.paid;
    setReceipt(null);
    // The charge outlives the booking; send the user where it now lives.
    if (unpaid) navigate('/payments');
  };

  return (
    <>
      <PageHeader
        title="Active bookings"
        description="Stays in progress. Check out to free the bay and settle the charge."
        actions={
          <Button onClick={() => navigate('/lots')} variant="primary">
            Book a bay
          </Button>
        }
      />

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={refetch}
        empty={
          bookings.length === 0 && (
            <EmptyState
              icon={SquareParking}
              title="Nothing parked right now"
              description="Book a bay and it will show here with a live timer."
              action={
                <Button variant="primary" onClick={() => navigate('/lots')}>
                  Find a lot
                </Button>
              }
            />
          )
        }
      >
        <motion.div
          variants={staggerParent}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              now={now}
              estimate={estimates.get(booking.id)}
              onCheckout={checkout}
              pending={checkingOut === booking.id}
            />
          ))}
        </motion.div>
      </AsyncBoundary>

      <CheckoutSummary
        open={Boolean(receipt) && !paying}
        onClose={closeReceipt}
        receipt={receipt}
        onPay={() => setPaying(true)}
      />

      <PayModal
        open={paying}
        onClose={() => {
          setPaying(false);
          closeReceipt();
        }}
        bookingId={receipt?.booking_id}
        amount={receipt?.final_amount}
        onPaid={() => {
          setPaying(false);
          setReceipt(null);
          refetchPayments();
          navigate('/payments');
        }}
      />
    </>
  );
}

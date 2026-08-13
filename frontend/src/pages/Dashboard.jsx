import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CarFront, Clock, Plus, Receipt, SquareParking } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { elapsed, money } from '@/lib/format';
import { staggerChild, staggerParent } from '@/lib/motion';
import { useNow } from '@/hooks/useNow';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/features/bookings/useBookings';
import { useVehicles } from '@/features/vehicles/useVehicles';
import { usePayments } from '@/features/payments/usePayments';
import { useLots } from '@/features/lots/useLots';
import { LotCard } from '@/features/lots/LotCard';

function StatTile({ icon: Icon, label, value, hint, to, loading }) {
  return (
    <motion.div variants={staggerChild}>
      <Card as={Link} to={to} className="flex items-start gap-3 p-4 transition-colors hover:border-line-strong">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="label-caps">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="tabular font-display text-2xl font-semibold leading-tight text-ink">{value}</p>
          )}
          {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
        </div>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { bookings, loading: loadingBookings } = useBookings();
  const { vehicles, loading: loadingVehicles } = useVehicles();
  const { due, totalDue, loading: loadingPayments } = usePayments();
  const { lots, loading: loadingLots, sortedBy } = useLots();

  const now = useNow(1000, bookings.length > 0);
  const current = bookings[0];
  const nearby = lots.slice(0, 3);

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.first_name || user?.username || 'there'}`}
        description="Where you are parked, what you owe, and what is open nearby."
        actions={
          <Button variant="primary" onClick={() => navigate('/lots')}>
            <Plus size={16} aria-hidden="true" />
            Book a bay
          </Button>
        }
      />

      <motion.div
        variants={staggerParent}
        initial="initial"
        animate="animate"
        className="mb-6 grid gap-4 sm:grid-cols-3"
      >
        <StatTile
          icon={SquareParking}
          label="Parked now"
          value={bookings.length}
          hint={bookings.length ? 'Tap to check out' : 'No active stays'}
          to="/bookings"
          loading={loadingBookings}
        />
        <StatTile
          icon={CarFront}
          label="Vehicles"
          value={vehicles.length}
          hint={vehicles.length ? 'Registered to you' : 'Add one to start booking'}
          to="/vehicles"
          loading={loadingVehicles}
        />
        <StatTile
          icon={Receipt}
          label="Outstanding"
          value={money(totalDue)}
          hint={due.length ? `${due.length} unpaid charge${due.length > 1 ? 's' : ''}` : 'All settled'}
          to="/payments"
          loading={loadingPayments}
        />
      </motion.div>

      {current && (
        <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-2">
              <span className="font-display text-base font-semibold leading-none text-ink">
                {current.slot?.slot_number}
              </span>
              <span className="label-caps mt-0.5">Bay</span>
            </span>
            <div>
              <p className="font-medium text-ink">{current.vehicle?.vehicle_model}</p>
              <p className="plate mt-0.5 text-sm">{current.vehicle?.vehicle_license}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 label-caps">
              <Clock size={13} aria-hidden="true" />
              Parked for
            </span>
            <span className="tabular font-display text-2xl font-semibold leading-none text-ink">
              {elapsed(current.check_in, now)}
            </span>
            <Button variant="primary" size="sm" onClick={() => navigate('/bookings')}>
              Check out
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="label-caps">{sortedBy === 'distance' ? 'Closest lots' : 'Parking lots'}</h2>
        <Link to="/lots" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          See all
        </Link>
      </div>

      {loadingLots ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : nearby.length === 0 ? (
        <EmptyState icon={SquareParking} title="No lots published" description="Nothing is available to book yet." />
      ) : (
        <motion.div
          variants={staggerParent}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {nearby.map((lot) => (
            <LotCard key={lot.id} lot={lot} onSelect={() => navigate('/lots')} />
          ))}
        </motion.div>
      )}
    </>
  );
}

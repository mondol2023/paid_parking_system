import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MapPin, RefreshCw, SquareParking, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { collapse, staggerParent } from '@/lib/motion';
import { lotService } from '@/api/services';
import { useResource } from '@/hooks/useResource';
import { useLots } from '@/features/lots/useLots';
import { LotCard } from '@/features/lots/LotCard';
import { SlotGrid } from '@/features/lots/SlotGrid';
import { BookingPanel } from '@/features/lots/BookingPanel';

/** Says out loud why the order is what it is, and offers a way back to distance. */
function GeoNotice({ geo }) {
  if (geo.status !== 'denied' && geo.status !== 'unavailable') return null;

  return (
    <div className="mb-5 flex flex-col gap-2 rounded-lg border border-line bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-muted">
        <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
        {geo.message} Showing every lot instead.
      </p>
      <Button size="sm" onClick={geo.retry} className="shrink-0">
        <RefreshCw size={14} aria-hidden="true" />
        Use my location
      </Button>
    </div>
  );
}

/**
 * The bays of one lot. Kept as its own component so its fetch lives and dies
 * with the selection instead of being a conditional hook in the page.
 */
function LotDetail({ lot, onClose, onBooked }) {
  const [slot, setSlot] = useState(null);

  const fetcher = useCallback(() => lotService.slots(lot.id), [lot.id]);
  // This endpoint answers {lot, slots} — the one list route that is not paginated.
  const { data, loading, error, refetch } = useResource(fetcher, { initialData: null });

  const slots = data?.slots ?? [];
  const free = slots.filter((s) => s.is_available).length;

  const booked = (booking) => {
    setSlot(null);
    refetch();
    onBooked?.(booking);
  };

  return (
    <motion.section variants={collapse} initial="initial" animate="animate" exit="exit" className="overflow-hidden">
      <Card className="mb-6 mt-2">
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold tracking-tight text-ink">{lot.name}</h2>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
              <Badge tone={free ? 'open' : 'taken'}>{free} open</Badge>
              <span className="truncate">{lot.address}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lot"
            className="-m-1 rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <AsyncBoundary
              loading={loading}
              error={error}
              onRetry={refetch}
              skeleton={
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              }
              empty={
                slots.length === 0 && (
                  <EmptyState icon={SquareParking} title="No bays here yet" description="This lot has no slots configured." />
                )
              }
            >
              <SlotGrid slots={slots} selectedId={slot?.id} onSelect={setSlot} />
            </AsyncBoundary>
          </div>

          <div className="lg:border-l lg:border-line lg:pl-5">
            <AnimatePresence mode="wait" initial={false}>
              {slot ? (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                >
                  <BookingPanel lot={lot} slot={slot} onCancel={() => setSlot(null)} onBooked={booked} />
                </motion.div>
              ) : (
                <motion.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted"
                >
                  Pick an open bay to book it.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.section>
  );
}

export default function Lots() {
  const navigate = useNavigate();
  const { lots, loading, error, refetch, sortedBy, geo } = useLots();
  const [selected, setSelected] = useState(null);
  const detailRef = useRef(null);

  const select = (lot) => {
    setSelected((current) => (current?.id === lot.id ? null : lot));
    // The bays open below the grid; on a phone that is off-screen.
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const onBooked = () => {
    refetch();
    navigate('/bookings');
  };

  return (
    <>
      <PageHeader
        title="Parking lots"
        description={
          sortedBy === 'distance' ? 'Closest to you first.' : 'Every active lot. Allow location to sort by distance.'
        }
        actions={
          <Button onClick={refetch} aria-label="Refresh lots">
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <GeoNotice geo={geo} />

      <div ref={detailRef} />
      <AnimatePresence initial={false}>
        {selected && <LotDetail key={selected.id} lot={selected} onClose={() => setSelected(null)} onBooked={onBooked} />}
      </AnimatePresence>

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={refetch}
        empty={
          lots.length === 0 && (
            <EmptyState
              icon={SquareParking}
              title="No lots available"
              description="Nothing is published yet. Check back, or widen your search by allowing location access."
              action={
                <Button onClick={refetch}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
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
          {lots.map((lot) => (
            <LotCard key={lot.id} lot={lot} onSelect={select} selected={selected?.id === lot.id} />
          ))}
        </motion.div>
      </AsyncBoundary>
    </>
  );
}

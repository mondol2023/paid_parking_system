import { motion } from 'motion/react';
import { CarFront, Clock, SquareParking } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusPill } from '@/components/ui/Badge';
import { dateTime, elapsed, hours, money, titleCase } from '@/lib/format';
import { staggerChild } from '@/lib/motion';

function Stat({ label, children }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="tabular mt-0.5 text-sm font-medium text-ink">{children}</p>
    </div>
  );
}

/**
 * One active stay. `now` is passed in rather than ticked here so a list of ten
 * bookings runs on one timer instead of ten.
 */
export function BookingCard({ booking, now, estimate, onCheckout, pending }) {
  const { vehicle, slot } = booking;

  return (
    <motion.div variants={staggerChild} layout>
      <Card className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border border-line-strong bg-surface-2">
              <span className="font-display text-base font-semibold leading-none text-ink">{slot?.slot_number}</span>
              <span className="label-caps mt-0.5">Bay</span>
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold tracking-tight text-ink">
                {vehicle?.vehicle_model}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="plate text-sm">{vehicle?.vehicle_license}</span>
                <Badge>{titleCase(vehicle?.vehicle_type)}</Badge>
              </p>
            </div>
          </div>
          <StatusPill status="active" />
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-baseline justify-between rounded-lg border border-line bg-surface-2 px-3 py-3">
            <span className="flex items-center gap-1.5 label-caps">
              <Clock size={13} aria-hidden="true" />
              Parked for
            </span>
            {/* The one live number on the page — it makes the stay feel running. */}
            <span className="tabular font-display text-2xl font-semibold leading-none text-ink">
              {elapsed(booking.check_in, now)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Checked in">{dateTime(booking.check_in)}</Stat>
            <Stat label="Reserved">{hours(booking.reserve_time)}</Stat>
            <Stat label="Estimate">{estimate != null ? money(estimate) : '—'}</Stat>
          </div>

          <p className="flex items-start gap-1.5 text-xs text-muted">
            <SquareParking size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
            {titleCase(slot?.size)} bay. You are billed for the hours you actually park, calculated at checkout.
          </p>
        </div>

        <div className="border-t border-line p-3">
          <Button variant="primary" className="w-full" loading={pending} onClick={() => onCheckout(booking)}>
            <CarFront size={16} aria-hidden="true" />
            Check out
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

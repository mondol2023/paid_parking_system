import { motion } from 'motion/react';
import { MapPin, Navigation } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EASE_OUT, staggerChild } from '@/lib/motion';
import { distance, money, titleCase } from '@/lib/format';

/** Free capacity as a bar — the one other place accent is spent besides buttons. */
function OccupancyMeter({ free, total }) {
  const ratio = total > 0 ? free / total : 0;
  const tone = free === 0 ? 'bg-taken' : ratio < 0.2 ? 'bg-alert' : 'bg-accent';

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label-caps">Free bays</span>
        <span className="tabular text-sm font-medium text-ink">
          {free}
          <span className="text-muted"> / {total}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(ratio * 100)}%` }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className={`h-full rounded-full ${tone}`}
        />
      </div>
    </div>
  );
}

export function LotCard({ lot, onSelect, selected }) {
  const free = lot.available_slots_count ?? 0;
  const full = free === 0;

  return (
    <motion.div variants={staggerChild} layout>
      <Card className={`flex h-full flex-col ${selected ? 'ring-2 ring-accent' : ''}`}>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-semibold tracking-tight text-ink">{lot.name}</h3>
              <p className="mt-0.5 flex items-start gap-1.5 text-sm text-muted">
                <MapPin size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{lot.address}</span>
              </p>
            </div>
            {lot.distance_km != null && (
              <Badge tone="accent" className="shrink-0">
                <Navigation size={11} aria-hidden="true" />
                {distance(lot.distance_km)}
              </Badge>
            )}
          </div>

          <OccupancyMeter free={free} total={lot.total_slots ?? 0} />

          {lot.rates?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lot.rates.map((rate) => (
                <span
                  key={rate.id}
                  className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted"
                >
                  {titleCase(rate.vehicle_type)} <span className="tabular text-ink">{money(rate.rate_per_hour)}</span>/h
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-line p-3">
          <Button
            variant={selected ? 'primary' : 'secondary'}
            className="w-full"
            disabled={full}
            onClick={() => onSelect(lot)}
          >
            {full ? 'Lot full' : selected ? 'Viewing bays' : 'View bays'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

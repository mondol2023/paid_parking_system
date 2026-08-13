import { motion } from 'motion/react';
import { CarFront, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { staggerChild } from '@/lib/motion';
import { titleCase } from '@/lib/format';

const Spec = ({ label, value }) => (
  <div>
    <p className="label-caps">{label}</p>
    <p className="tabular mt-0.5 text-sm text-ink">{value}</p>
  </div>
);

export function VehicleCard({ vehicle, onEdit, onRemove, removing }) {
  const { vehicle_image: image, vehicle_name: name, vehicle_model: model } = vehicle;

  return (
    <motion.div variants={staggerChild} layout>
      <Card className="flex h-full flex-col overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
            {image ? (
              <img src={image} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-muted">
                <CarFront size={20} aria-hidden="true" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-display text-lg font-semibold tracking-tight text-ink">
                {name || model}
              </h3>
              <Badge tone="neutral">{titleCase(vehicle.vehicle_type)}</Badge>
            </div>
            <p className="truncate text-sm text-muted">{model}</p>
            <p className="plate mt-1.5 inline-block">{vehicle.vehicle_license}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-line px-4 py-3">
          <Spec label="Length" value={`${vehicle.vehicle_length} m`} />
          <Spec label="Width" value={`${vehicle.vehicle_width} m`} />
          <Spec label="Height" value={`${vehicle.vehicle_height} m`} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <div className="min-w-0">
            <p className="label-caps">Driver</p>
            <p className="truncate text-sm text-ink">{vehicle.driver_name}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" aria-label="Edit vehicle" onClick={() => onEdit(vehicle)}>
              <Pencil size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove vehicle"
              loading={removing}
              onClick={() => onRemove(vehicle)}
              className="hover:text-alert"
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

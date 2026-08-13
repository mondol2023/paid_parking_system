import { useState } from 'react';
import { motion } from 'motion/react';
import { CarFront, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { controlClass } from '@/components/ui/controlClass';
import { staggerParent } from '@/lib/motion';
import { VEHICLE_TYPES } from '@/lib/constants';
import { errorMessage, statusOf } from '@/lib/errors';
import { vehicleService } from '@/api/services';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useToast } from '@/context/ToastContext';
import { useVehicles } from '@/features/vehicles/useVehicles';
import { VehicleCard } from '@/features/vehicles/VehicleCard';
import { VehicleForm } from '@/features/vehicles/VehicleForm';

export default function Vehicles() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  // Debounced: the old page fired a request on every keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);

  const { vehicles, loading, error, refetch } = useVehicles({ search: debouncedSearch, type });

  const [editing, setEditing] = useState(null); // vehicle | 'new' | null
  const [confirming, setConfirming] = useState(null);
  const [removing, setRemoving] = useState(false);

  const save = async (formData) => {
    if (editing === 'new') {
      await vehicleService.create(formData);
      toast.success('Vehicle registered.');
    } else {
      await vehicleService.update(editing.id, formData);
      toast.success('Vehicle updated.');
    }
    setEditing(null);
    refetch();
  };

  const remove = async () => {
    setRemoving(true);
    try {
      await vehicleService.remove(confirming.id);
      toast.success(`${confirming.vehicle_license} removed.`);
      setConfirming(null);
      refetch();
    } catch (err) {
      // 409 = the vehicle is sitting in an active booking.
      toast.error(statusOf(err) === 409 ? errorMessage(err) : errorMessage(err, 'Could not remove that vehicle.'));
    } finally {
      setRemoving(false);
    }
  };

  const filtering = Boolean(debouncedSearch.trim() || type);

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Every vehicle you can park. Dimensions decide which slot sizes you can book."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} aria-hidden="true" />
            Add vehicle
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by license plate"
            aria-label="Search by license plate"
            className={`${controlClass(false)} pl-9`}
          />
        </div>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          aria-label="Filter by vehicle type"
          disabled={Boolean(debouncedSearch.trim())}
          className={`${controlClass(false)} sm:w-44`}
        >
          <option value="">All types</option>
          {VEHICLE_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={refetch}
        empty={
          vehicles.length === 0 && (
            <EmptyState
              icon={CarFront}
              title={filtering ? 'No matching vehicles' : 'No vehicles yet'}
              description={
                filtering
                  ? 'Try a different plate or clear the filter.'
                  : 'Register a vehicle to start booking parking slots.'
              }
              action={
                filtering ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setType('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => setEditing('new')}>
                    <Plus size={16} aria-hidden="true" />
                    Add vehicle
                  </Button>
                )
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
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={setEditing}
              onRemove={setConfirming}
              removing={removing && confirming?.id === vehicle.id}
            />
          ))}
        </motion.div>
      </AsyncBoundary>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === 'new' ? 'Register a vehicle' : 'Edit vehicle'}
        description={editing === 'new' ? 'All measurements are in metres.' : undefined}
      >
        {editing && (
          <VehicleForm
            vehicle={editing === 'new' ? null : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={remove}
        pending={removing}
        title="Remove this vehicle?"
        description={confirming ? `${confirming.vehicle_model} — ${confirming.vehicle_license}` : undefined}
        confirmLabel="Remove"
      >
        <p className="text-sm text-muted">
          It stops appearing when you book. A vehicle with an active booking cannot be removed.
        </p>
      </ConfirmDialog>
    </>
  );
}

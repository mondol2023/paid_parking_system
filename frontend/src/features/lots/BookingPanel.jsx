import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'motion/react';
import { CarFront, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { money, titleCase } from '@/lib/format';
import { EASE_OUT, staggerChild, staggerParent } from '@/lib/motion';
import { bookingService } from '@/api/services';
import { useServerErrors } from '@/hooks/useServerErrors';
import { useToast } from '@/context/ToastContext';
import { useVehicles } from '@/features/vehicles/useVehicles';

/** DRF field names this form owns; anything else lands in the banner. */
const FIELDS = ['vehicle', 'slot', 'reserve_time'];

/** MAX_RESERVE_HOURS in booking/serializers.py. Mirrored so we fail fast. */
const MAX_HOURS = 720;

export function BookingPanel({ lot, slot, onCancel, onBooked }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { vehicles, loading: loadingVehicles } = useVehicles();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { vehicle: '', reserve_time: '2' } });

  const { formError, apply, clear } = useServerErrors(setError, FIELDS);

  // A fresh bay is a fresh attempt — drop the last server error with it.
  useEffect(() => {
    clear();
  }, [slot?.id, clear]);

  // Default to the only vehicle once it arrives, so the common case is one tap.
  useEffect(() => {
    if (vehicles.length === 1) reset((values) => ({ ...values, vehicle: String(vehicles[0].id) }));
  }, [vehicles, reset]);

  const vehicleId = watch('vehicle');
  const reserveTime = watch('reserve_time');

  const selectedVehicle = vehicles.find((v) => String(v.id) === String(vehicleId));

  // The lot prices per vehicle type; without a matching rate the backend bills 0.
  const rate = useMemo(
    () => lot.rates?.find((r) => r.vehicle_type === selectedVehicle?.vehicle_type),
    [lot.rates, selectedVehicle],
  );

  const estimate = rate && Number(reserveTime) > 0 ? Number(rate.rate_per_hour) * Number(reserveTime) : null;

  const submit = handleSubmit(async (values) => {
    clear();
    try {
      const booking = await bookingService.create({
        vehicle: Number(values.vehicle),
        slot: slot.id,
        reserve_time: Number(values.reserve_time),
      });
      toast.success(`Bay ${slot.slot_number} is yours.`);
      onBooked?.(booking);
    } catch (err) {
      // 409 = somebody else took the bay between render and submit.
      apply(err);
    }
  });

  if (loadingVehicles) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner label="Loading your vehicles" />
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={CarFront}
        title="Add a vehicle first"
        description="A booking is tied to a registered vehicle — its dimensions decide which bays it fits."
        action={
          <Button variant="primary" onClick={() => navigate('/vehicles')}>
            Register a vehicle
          </Button>
        }
      />
    );
  }

  return (
    <motion.form
      onSubmit={submit}
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-4"
    >
      {/* The tile the user clicked, arriving here rather than being redrawn. */}
      <motion.div variants={staggerChild} className="flex items-center gap-3">
        <div className="relative flex size-14 shrink-0 flex-col items-center justify-center rounded-lg border border-accent">
          <motion.span layoutId="slot-selection" className="absolute inset-0 rounded-lg bg-accent-soft ring-2 ring-accent" />
          <span className="relative font-display text-xl font-semibold leading-none tracking-tight text-ink">
            {slot.slot_number}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold tracking-tight text-ink">{lot.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            <Badge tone="open">{titleCase(slot.size)}</Badge>
            <span className="truncate">{lot.address}</span>
          </p>
        </div>
      </motion.div>

      <motion.div variants={staggerChild}>
        <Alert message={formError} />
      </motion.div>

      <motion.div variants={staggerChild}>
        <Select
          label="Vehicle"
          required
          placeholder="Choose a vehicle"
          error={errors.vehicle?.message}
          options={vehicles.map((vehicle) => ({
            value: String(vehicle.id),
            label: `${vehicle.vehicle_model} — ${vehicle.vehicle_license}`,
          }))}
          {...register('vehicle', { required: 'Pick which vehicle is parking.' })}
        />
      </motion.div>

      <motion.div variants={staggerChild}>
        <Input
          label="Reserved hours"
          type="number"
          step="0.5"
          min="0.5"
          max={MAX_HOURS}
          required
          hint="You are billed on the hours you actually park, at checkout."
          error={errors.reserve_time?.message}
          {...register('reserve_time', {
            required: 'How long do you need the bay?',
            valueAsNumber: true,
            min: { value: 0.01, message: 'Reserve at least a few minutes.' },
            max: { value: MAX_HOURS, message: `The longest reservation is ${MAX_HOURS} hours.` },
          })}
        />
      </motion.div>

      <motion.div
        variants={staggerChild}
        className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2.5"
      >
        <span className="flex items-center gap-1.5 label-caps">
          <Clock size={13} aria-hidden="true" />
          Estimate
        </span>
        {estimate != null ? (
          <motion.span
            key={estimate}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="tabular text-base font-semibold text-ink"
          >
            {money(estimate)}
          </motion.span>
        ) : (
          <span className="text-sm text-muted">
            {selectedVehicle ? 'No rate published for this vehicle type' : 'Pick a vehicle'}
          </span>
        )}
      </motion.div>

      <motion.div variants={staggerChild} className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Book this bay
        </Button>
      </motion.div>
    </motion.form>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'motion/react';
import { ImagePlus, X } from 'lucide-react';
import { Input, Select } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useServerErrors } from '@/hooks/useServerErrors';
import { VEHICLE_FIELD_NAMES, VEHICLE_SECTIONS, emptyVehicle, toFormValues } from './vehicleFields';

const CONTROLS = { select: Select, input: Input };

/** One field entry → one control. LSP: every control takes the same contract. */
function FieldFromConfig({ config, register, error }) {
  const { name, control = 'input', rules, ...rest } = config;
  const Control = CONTROLS[control] ?? Input;

  return <Control {...rest} error={error} {...register(name, rules)} />;
}

function ImagePicker({ file, existingUrl, onPick, onClear }) {
  const inputRef = useRef(null);
  // Derived from the file, not stored — the effect below only handles cleanup.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview ?? existingUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
        {shown ? (
          <motion.img
            key={shown}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            src={shown}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted">
            <ImagePlus size={22} aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          {shown ? 'Replace photo' : 'Add a photo'}
        </Button>
        {file && (
          <button
            type="button"
            onClick={() => {
              onClear();
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="flex items-center gap-1 text-xs text-muted hover:text-alert"
          >
            <X size={13} aria-hidden="true" />
            Remove
          </button>
        )}
        <p className="text-xs text-muted">Optional. JPG or PNG.</p>
      </div>
    </div>
  );
}

/**
 * Create and edit share one form; `vehicle` decides which. Values are posted as
 * multipart so the image rides along on the same request.
 */
export function VehicleForm({ vehicle, onSubmit, onCancel }) {
  const [file, setFile] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: vehicle ? toFormValues(vehicle) : emptyVehicle() });

  const { formError, apply, clear } = useServerErrors(setError, VEHICLE_FIELD_NAMES);

  const submit = async (values) => {
    clear();
    const payload = new FormData();
    VEHICLE_FIELD_NAMES.forEach((name) => {
      const value = values[name];
      // Blank optionals are omitted rather than sent as '' — the API rejects
      // empty strings on nullable CharFields.
      if (value !== '' && value !== null && value !== undefined && !Number.isNaN(value)) {
        payload.append(name, value);
      }
    });
    if (file) payload.append('vehicle_image', file);

    try {
      await onSubmit(payload);
    } catch (error) {
      apply(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-6">
      <Alert message={formError} />

      <ImagePicker
        file={file}
        existingUrl={vehicle?.vehicle_image}
        onPick={setFile}
        onClear={() => setFile(null)}
      />

      {VEHICLE_SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <div>
            <h3 className="label-caps">{section.title}</h3>
            {section.description && <p className="mt-0.5 text-xs text-muted">{section.description}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((config) => (
              <FieldFromConfig
                key={config.name}
                config={config}
                register={register}
                error={errors[config.name]?.message}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {vehicle ? 'Save changes' : 'Register vehicle'}
        </Button>
      </div>
    </form>
  );
}

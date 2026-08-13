import { VEHICLE_TYPES } from '@/lib/constants';

const required = (message) => ({ required: message });

/** Dimensions are non-nullable FloatFields — the old form posted empty strings. */
const dimension = (label) => ({
  name: `vehicle_${label.toLowerCase()}`,
  label: `${label} (m)`,
  type: 'number',
  step: '0.01',
  min: '0',
  required: true,
  rules: {
    required: `${label} is required.`,
    min: { value: 0.1, message: `${label} must be greater than zero.` },
    valueAsNumber: true,
  },
});

/**
 * The whole form is data. VehicleForm renders these sections generically, so a
 * new field is a new entry here and never a new block of JSX (this replaces the
 * eight copy-pasted inputs in the old page).
 */
export const VEHICLE_SECTIONS = [
  {
    title: 'Vehicle',
    fields: [
      { name: 'vehicle_name', label: 'Nickname', placeholder: 'Daily driver', hint: 'Optional — how you refer to it.' },
      { name: 'vehicle_model', label: 'Model', placeholder: 'Toyota Axio', required: true, rules: required('Enter the model.') },
      {
        name: 'vehicle_license',
        label: 'License plate',
        placeholder: 'DHA-1234',
        required: true,
        rules: required('Enter the license plate.'),
      },
      {
        name: 'vehicle_type',
        label: 'Type',
        control: 'select',
        options: VEHICLE_TYPES,
        required: true,
        rules: required('Pick a vehicle type.'),
      },
    ],
  },
  {
    title: 'Dimensions',
    description: 'Used to match your vehicle to a slot size.',
    fields: [dimension('Length'), dimension('Width'), dimension('Height')],
  },
  {
    title: 'Driver',
    fields: [
      { name: 'driver_name', label: 'Driver name', required: true, rules: required("Enter the driver's name.") },
      {
        name: 'driver_phone',
        label: 'Driver phone',
        type: 'tel',
        required: true,
        rules: {
          required: "Enter the driver's phone number.",
          maxLength: { value: 14, message: 'Use at most 14 characters.' },
        },
      },
      { name: 'driver_license', label: 'Driver license no.', required: true, rules: required('Enter the license number.') },
    ],
  },
  {
    title: 'Owner',
    description: 'Only if the owner is someone other than the driver.',
    fields: [
      { name: 'owner_name', label: 'Owner name' },
      { name: 'owner_phone', label: 'Owner phone', type: 'tel' },
    ],
  },
];

export const VEHICLE_FIELD_NAMES = VEHICLE_SECTIONS.flatMap((s) => s.fields.map((f) => f.name));

export const emptyVehicle = () =>
  VEHICLE_FIELD_NAMES.reduce((acc, name) => ({ ...acc, [name]: '' }), { vehicle_type: 'car' });

/** API object → form values (numbers arrive as numbers, inputs want strings). */
export const toFormValues = (vehicle) =>
  VEHICLE_FIELD_NAMES.reduce(
    (acc, name) => ({ ...acc, [name]: vehicle?.[name] ?? '' }),
    {},
  );

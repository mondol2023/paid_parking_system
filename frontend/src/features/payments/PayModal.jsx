import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { money } from '@/lib/format';
import { METHOD_REQUIRES_REFERENCE, PAYMENT_METHODS } from '@/lib/constants';
import { collapse } from '@/lib/motion';
import { paymentService } from '@/api/services';
import { useServerErrors } from '@/hooks/useServerErrors';
import { useToast } from '@/context/ToastContext';

const FIELDS = ['payment_method', 'transaction_id'];

/**
 * Settling one payment. Shared by the checkout flow and the payments page so
 * "pay now" behaves identically wherever the user reaches it.
 */
export function PayModal({ open, onClose, bookingId, amount, onPaid }) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { payment_method: 'card', transaction_id: '' } });

  const { formError, apply, clear } = useServerErrors(setError, FIELDS);

  useEffect(() => {
    if (open) {
      reset({ payment_method: 'card', transaction_id: '' });
      clear();
    }
  }, [open, reset, clear]);

  const method = watch('payment_method');
  // Only mobile banking carries a reference the user has to copy across.
  const needsReference = METHOD_REQUIRES_REFERENCE.has(method);

  const submit = handleSubmit(async (values) => {
    clear();
    try {
      await paymentService.pay(bookingId, {
        payment_method: values.payment_method,
        ...(needsReference ? { transaction_id: values.transaction_id.trim() } : {}),
      });
      toast.success(`${money(amount)} paid.`);
      onPaid?.();
    } catch (err) {
      apply(err);
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pay for this stay"
      description={`Booking #${bookingId}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button variant="primary" onClick={submit} loading={isSubmitting}>
            Pay {money(amount)}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Alert message={formError} />

        <div className="flex items-baseline justify-between rounded-lg border border-line bg-surface-2 px-3 py-3">
          <span className="label-caps">Amount due</span>
          <span className="tabular font-display text-2xl font-semibold text-ink">{money(amount)}</span>
        </div>

        <Select
          label="Payment method"
          required
          options={PAYMENT_METHODS}
          error={errors.payment_method?.message}
          {...register('payment_method', { required: 'Choose how you are paying.' })}
        />

        <AnimatePresence initial={false}>
          {needsReference && (
            <motion.div variants={collapse} initial="initial" animate="animate" exit="exit" className="overflow-hidden">
              <Input
                label="Transaction reference"
                required
                placeholder="e.g. TXN4419028"
                hint="The reference from your mobile banking receipt."
                error={errors.transaction_id?.message}
                {...register('transaction_id', {
                  // Registered unconditionally would block card/cash payments.
                  validate: (value) =>
                    !needsReference || value.trim().length > 0 || 'Enter the reference from your receipt.',
                })}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lets Enter submit from a field without a second visible button. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

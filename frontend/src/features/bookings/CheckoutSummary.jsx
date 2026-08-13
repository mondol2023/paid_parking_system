import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { hours } from '@/lib/format';
import { staggerChild, staggerParent } from '@/lib/motion';

/**
 * Step one of checkout: what the stay actually cost. Payment is a separate,
 * skippable step — the charge survives in /payments/ either way, so dismissing
 * this no longer loses the debt the way the old modal did.
 */
export function CheckoutSummary({ open, onClose, receipt, onPay }) {
  const settled = receipt?.paid;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Checked out"
      description="The bay is free again."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {settled ? 'Done' : 'Pay later'}
          </Button>
          {!settled && (
            <Button variant="primary" onClick={onPay}>
              Pay now
            </Button>
          )}
        </>
      }
    >
      <motion.div variants={staggerParent} initial="initial" animate="animate" className="flex flex-col gap-4">
        <motion.div variants={staggerChild} className="flex items-center gap-2 text-open">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span className="text-sm font-medium">{receipt?.message ?? 'Checkout successful.'}</span>
        </motion.div>

        <motion.div
          variants={staggerChild}
          className="flex flex-col items-center rounded-xl border border-line bg-surface-2 px-4 py-6"
        >
          <span className="label-caps">Total</span>
          <CountUp
            value={receipt?.final_amount}
            className="tabular font-display text-4xl font-semibold tracking-tight text-ink"
          />
          <span className="mt-1 text-sm text-muted">for {hours(receipt?.actual_hours)} parked</span>
        </motion.div>

        {!settled && (
          <motion.p variants={staggerChild} className="text-sm text-muted">
            Not paying now is fine — this charge waits for you on the Payments page.
          </motion.p>
        )}
      </motion.div>
    </Modal>
  );
}

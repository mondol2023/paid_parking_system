import { motion } from 'motion/react';
import { Receipt } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Badge';
import { dateTime, money, titleCase } from '@/lib/format';
import { staggerChild } from '@/lib/motion';

/** One row of the ledger. `onPay` is only passed for unpaid rows. */
export function PaymentCard({ payment, onPay }) {
  return (
    <motion.div variants={staggerChild} layout>
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
            <Receipt size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium text-ink">
              Booking #{payment.booking}
              <StatusPill status={payment.paid ? 'paid' : 'due'} />
            </p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {payment.paid
                ? `${titleCase(payment.payment_method) || 'Paid'} · ${dateTime(payment.paid_at)}`
                : `Raised ${dateTime(payment.created_at)}`}
              {payment.transaction_id && <span className="plate ml-2">{payment.transaction_id}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="tabular font-display text-xl font-semibold text-ink">{money(payment.amount)}</span>
          {onPay && (
            <Button variant="primary" size="sm" onClick={() => onPay(payment)}>
              Pay now
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

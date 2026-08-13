import { useState } from 'react';
import { motion } from 'motion/react';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { money } from '@/lib/format';
import { staggerParent } from '@/lib/motion';
import { usePayments } from '@/features/payments/usePayments';
import { PaymentCard } from '@/features/payments/PaymentCard';
import { PayModal } from '@/features/payments/PayModal';

function Section({ title, count, children }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-3 flex items-center gap-2 label-caps">
        {title}
        <span className="tabular text-muted">({count})</span>
      </h2>
      {children}
    </section>
  );
}

export default function Payments() {
  const { due, settled, totalDue, loading, error, refetch } = usePayments();
  const [paying, setPaying] = useState(null);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every charge for your stays. Anything unpaid stays here until it is settled."
        actions={
          totalDue > 0 && (
            <div className="rounded-lg border border-alert/30 bg-alert-soft px-3 py-2 text-right">
              <p className="label-caps text-alert">Outstanding</p>
              <p className="tabular font-display text-lg font-semibold text-ink">{money(totalDue)}</p>
            </div>
          )
        }
      />

      <AsyncBoundary
        loading={loading}
        error={error}
        onRetry={refetch}
        skeleton={
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        }
        empty={
          due.length === 0 &&
          settled.length === 0 && (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="Charges appear here once you check out of a parking bay."
            />
          )
        }
      >
        <motion.div variants={staggerParent} initial="initial" animate="animate">
          {due.length > 0 && (
            <Section title="Due" count={due.length}>
              <div className="flex flex-col gap-3">
                {due.map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} onPay={setPaying} />
                ))}
              </div>
            </Section>
          )}

          {settled.length > 0 && (
            <Section title="Settled" count={settled.length}>
              <div className="flex flex-col gap-3">
                {settled.map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} />
                ))}
              </div>
            </Section>
          )}
        </motion.div>
      </AsyncBoundary>

      <PayModal
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        bookingId={paying?.booking}
        amount={paying?.amount}
        onPaid={() => {
          setPaying(null);
          refetch();
        }}
      />
    </>
  );
}

import RelativeTime from './RelativeTime.tsx';
import type { Order, OrderStatus } from '../types.ts';

const LABELS: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const HAPPY_PATH: OrderStatus[] = ['PLACED', 'CONFIRMED', 'COMPLETED'];

type StepState = 'done' | 'current' | 'upcoming';

/**
 * The steps a booking goes through, from placed to completed (or cancelled), with the
 * current one marked. The order only records when it was created and last changed, so only
 * the first and current steps carry a time.
 */
export default function OrderTimeline({ order }: { order: Order }) {
  const steps: { status: OrderStatus; state: StepState; at?: string }[] =
    order.status === 'CANCELLED'
      ? [
          { status: 'PLACED', state: 'done', at: order.createdAt },
          { status: 'CANCELLED', state: 'current', at: order.updatedAt },
        ]
      : HAPPY_PATH.map((status, index) => {
          const current = HAPPY_PATH.indexOf(order.status);
          const state: StepState =
            index < current ? 'done' : index === current ? 'current' : 'upcoming';
          const at =
            index === 0 ? order.createdAt : state === 'current' ? order.updatedAt : undefined;
          return { status, state, at };
        });

  return (
    <ol className="timeline" aria-label="Booking progress">
      {steps.map(({ status, state, at }) => (
        <li
          key={status}
          className={`timeline-step timeline-${state} timeline-${status.toLowerCase()}`}
          aria-current={state === 'current' ? 'step' : undefined}
        >
          <span className="timeline-label">{LABELS[status]}</span>
          {at && (
            <span className="muted small">
              <RelativeTime value={at} />
            </span>
          )}
          {state === 'upcoming' && <span className="sr-only"> (not yet)</span>}
        </li>
      ))}
    </ol>
  );
}

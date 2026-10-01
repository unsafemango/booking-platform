import type { OrderStatus } from '../types.ts';

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}

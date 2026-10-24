import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import OfflineBanner from '../components/OfflineBanner.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import { cancelOrder, getOrder } from '../api/orders.ts';
import { money, orderRef } from '../lib/api.ts';
import { useToast } from '../lib/toast.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useOrderUpdates } from '../lib/useOrderUpdates.ts';

export default function OrderDetail() {
  const { id = '' } = useParams();
  const load = useCallback((signal: AbortSignal) => getOrder(id, signal), [id]);
  const { data: order, error, errorStatus, setData: setOrder } = useFetch(load);
  // The order service answers 404 for unknown ids and for other users' orders,
  // and 400 for ids that aren't UUIDs.
  const notFound = errorStatus === 404 || errorStatus === 400;
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { show } = useToast();
  useDocumentTitle(
    order ? `Booking ${orderRef(order.id)}` : notFound ? 'Booking not found' : 'Booking',
  );

  useEffect(() => setActionError(null), [id]);

  const live = useOrderUpdates(
    (event) => {
      if (event.orderId !== id) return;
      if (order && order.status !== event.status) {
        show(`Booking ${orderRef(event.orderId)} is now ${event.status.toLowerCase()}`, {
          tone: event.status === 'CANCELLED' ? 'danger' : 'info',
          id: `order-${event.orderId}-${event.status}`,
        });
      }
      setOrder((current) =>
        current ? { ...current, status: event.status, updatedAt: event.occurredAt } : current,
      );
    },
    () => {
      // Catch up on any status change missed while the connection was down.
      if (!order) return;
      getOrder(id)
        .then((data) => setOrder((current) => (current?.id === data.id ? data : current)))
        .catch(() => {});
    },
  );

  async function cancel() {
    setCancelling(true);
    setActionError(null);
    try {
      const updated = await cancelOrder(id);
      setOrder(() => updated);
      show(`Booking ${orderRef(id)} cancelled`, { id: `order-${id}-${updated.status}` });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  }

  const back = (
    <Link to="/orders" className="back-link">
      ← My bookings
    </Link>
  );

  if (notFound) {
    return (
      <>
        {back}
        <div className="empty">
          <h1>Booking not found</h1>
          <p className="muted">It doesn't exist or belongs to another account.</p>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        {back}
        <Alert>Couldn't load this booking: {error}</Alert>
      </>
    );
  }
  if (!order) {
    return (
      <>
        {back}
        <p role="status" className="muted">
          Loading booking…
        </p>
      </>
    );
  }

  const cancellable = order.status === 'PLACED' || order.status === 'CONFIRMED';

  return (
    <>
      {back}
      <OfflineBanner connected={live} />
      <article className="card order order-detail">
        <div className="order-head">
          <h1>
            Booking <span className="mono">{orderRef(order.id)}</span>
          </h1>
          <StatusBadge status={order.status} />
        </div>
        <dl className="order-meta">
          <dt>Placed</dt>
          <dd>{new Date(order.createdAt).toLocaleString()}</dd>
          <dt>Last update</dt>
          <dd>{new Date(order.updatedAt).toLocaleString()}</dd>
        </dl>
        <ul className="order-items">
          {order.items.map((i) => (
            <li key={i.productId}>
              <span>
                {i.quantity} × <Link to={`/products/${i.productId}`}>{i.productName}</Link>{' '}
                <span className="muted small">at {money(i.unitPrice)}</span>
              </span>
              <span>{money(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        {actionError && <Alert>{actionError}</Alert>}
        <div className="order-foot">
          <strong>Total {money(order.total)}</strong>
          {cancellable && (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Cancel booking
            </Button>
          )}
        </div>
        <p className="muted small">{live ? 'Live updates on' : 'Connecting for live updates…'}</p>
      </article>

      <ConfirmDialog
        open={confirming && cancellable}
        title="Cancel this booking?"
        confirmLabel={cancelling ? 'Cancelling…' : 'Yes, cancel booking'}
        cancelLabel="Keep booking"
        busy={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Booking <span className="mono">{orderRef(order.id)}</span> ({money(order.total)}) will be
          cancelled. This can't be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import { ApiError, api, money, orderRef } from '../lib/api.ts';
import { useToast } from '../lib/toast.tsx';
import { useOrderUpdates } from '../lib/useOrderUpdates.ts';
import type { Order } from '../types.ts';

export default function OrderDetail() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    let active = true;
    setOrder(null);
    setError(null);
    setActionError(null);
    setNotFound(false);
    api<Order>(`/api/orders/${encodeURIComponent(id)}`)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        // The order service answers 404 for unknown ids and for other users' orders,
        // and 400 for ids that aren't UUIDs.
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setNotFound(true);
        else setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, [id]);

  const live = useOrderUpdates((event) => {
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
  });

  async function cancel() {
    setCancelling(true);
    setActionError(null);
    try {
      const updated = await api<Order>(`/api/orders/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
      });
      setOrder(updated);
      show(`Booking ${orderRef(id)} cancelled`, { id: `order-${id}-${updated.status}` });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
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
            <Button variant="danger" disabled={cancelling} onClick={cancel}>
              {cancelling ? 'Cancelling…' : 'Cancel booking'}
            </Button>
          )}
        </div>
        <p className="muted small">{live ? 'Live updates on' : 'Connecting for live updates…'}</p>
      </article>
    </>
  );
}

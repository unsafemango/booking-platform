import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import { OrderListSkeleton } from '../components/Skeleton.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import { api, money, orderRef } from '../lib/api.ts';
import { useToast } from '../lib/toast.tsx';
import { useOrderUpdates } from '../lib/useOrderUpdates.ts';
import type { Notification, Order } from '../types.ts';

function isCancellable(order: Order) {
  return order.status === 'PLACED' || order.status === 'CONFIRMED';
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { show } = useToast();

  const loadNotifications = useCallback(() => {
    api<Notification[]>('/api/notifications')
      .then(setNotifications)
      .catch(() => {});
  }, []);

  useEffect(() => {
    api<Order[]>('/api/orders')
      .then(setOrders)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    loadNotifications();
  }, [loadNotifications]);

  const live = useOrderUpdates((event) => {
    const known = orders?.find((o) => o.id === event.orderId);
    if (known && known.status !== event.status) {
      show(`Booking ${orderRef(event.orderId)} is now ${event.status.toLowerCase()}`, {
        tone: event.status === 'CANCELLED' ? 'danger' : 'info',
        id: `order-${event.orderId}-${event.status}`,
      });
    }
    setOrders(
      (current) =>
        current?.map((o) =>
          o.id === event.orderId ? { ...o, status: event.status, updatedAt: event.occurredAt } : o,
        ) ?? null,
    );
    setFlash(event.orderId);
    setTimeout(() => setFlash((id) => (id === event.orderId ? null : id)), 1500);
    // The notification service handles the same event; give it a moment to send the email.
    setTimeout(loadNotifications, 500);
  });

  // Looked up from the live list so the dialog closes if the order is cancelled elsewhere.
  const confirming = orders?.find((o) => o.id === confirmingId && isCancellable(o)) ?? null;

  async function cancel(id: string) {
    setCancelling(true);
    try {
      const updated = await api<Order>(`/api/orders/${id}/cancel`, { method: 'POST' });
      setOrders((current) => current?.map((o) => (o.id === id ? updated : o)) ?? null);
      show(`Booking ${orderRef(id)} cancelled`, { id: `order-${id}-${updated.status}` });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
      setConfirmingId(null);
    }
  }

  return (
    <div className="orders-layout">
      <section>
        <div className="page-head row">
          <h1>My bookings</h1>
          <span className={`live ${live ? 'on' : ''}`}>{live ? 'Live' : 'Connecting…'}</span>
        </div>
        {error && <Alert>{error}</Alert>}
        {orders === null && !error && <OrderListSkeleton />}
        {orders?.length === 0 && (
          <p className="muted">
            No bookings yet. <Link to="/">Find something to book.</Link>
          </p>
        )}
        <div className="stack">
          {orders?.map((o) => (
            <article key={o.id} className={`card order ${flash === o.id ? 'flash' : ''}`}>
              <div className="order-head">
                <div>
                  <Link to={`/orders/${o.id}`} className="mono">
                    {orderRef(o.id)}
                  </Link>
                  <span className="muted"> · {new Date(o.createdAt).toLocaleString()}</span>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <ul className="order-items">
                {o.items.map((i) => (
                  <li key={i.productId}>
                    <span>
                      {i.quantity} × {i.productName}
                    </span>
                    <span>{money(i.unitPrice * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="order-foot">
                <strong>{money(o.total)}</strong>
                {isCancellable(o) && (
                  <Button variant="danger" onClick={() => setConfirmingId(o.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="card inbox">
        <h2>Emails sent</h2>
        {notifications.length === 0 && <p className="muted">Nothing yet.</p>}
        <ul>
          {notifications.map((n, idx) => (
            <li key={`${n.orderId}-${n.sentAt}-${idx}`}>
              <div>{n.subject}</div>
              <div className="muted small">{new Date(n.sentAt).toLocaleTimeString()}</div>
            </li>
          ))}
        </ul>
      </aside>

      <ConfirmDialog
        open={confirming !== null}
        title="Cancel this booking?"
        confirmLabel={cancelling ? 'Cancelling…' : 'Yes, cancel booking'}
        cancelLabel="Keep booking"
        busy={cancelling}
        onConfirm={() => confirming && cancel(confirming.id)}
        onCancel={() => setConfirmingId(null)}
      >
        {confirming && (
          <p>
            Booking <span className="mono">{orderRef(confirming.id)}</span> (
            {money(confirming.total)}) will be cancelled. This can't be undone.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

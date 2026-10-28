import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import OfflineBanner from '../components/OfflineBanner.tsx';
import { OrderListSkeleton } from '../components/Skeleton.tsx';
import StatusBadge from '../components/StatusBadge.tsx';
import { listNotifications } from '../api/notifications.ts';
import { cancelOrder, listOrders } from '../api/orders.ts';
import { money, orderRef } from '../lib/api.ts';
import { useToast } from '../lib/toast.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useFetch } from '../lib/useFetch.ts';
import { useOrderUpdates } from '../lib/useOrderUpdates.ts';
import type { Notification, Order, OrderStatus } from '../types.ts';

const STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

function isCancellable(order: Order) {
  return order.status === 'PLACED' || order.status === 'CONFIRMED';
}

/** The ?status= value as an order status, or null (All) when missing or unknown. */
function toStatus(value: string | null): OrderStatus | null {
  const upper = value?.toUpperCase();
  return STATUSES.find((s) => s === upper) ?? null;
}

export default function Orders() {
  const {
    data: orders,
    error,
    setData: setOrders,
    reload: reloadOrders,
  } = useFetch(listOrders, { keepPrevious: true });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { show } = useToast();
  const [params, setParams] = useSearchParams();
  const status = toStatus(params.get('status'));
  const setStatus = (value: OrderStatus | null) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('status', value.toLowerCase());
      else next.delete('status');
      return next;
    });
  // Filtered on the client; a live update can move an order in or out of the current view.
  const shown = status ? orders?.filter((o) => o.status === status) : orders;
  useDocumentTitle('My bookings');

  // Pending flash and reload timers, cleared on unmount so none fire after the page is gone.
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const loadNotifications = useCallback((signal?: AbortSignal) => {
    listNotifications(signal)
      .then(setNotifications)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadNotifications(controller.signal);
    return () => controller.abort();
  }, [loadNotifications]);

  const live = useOrderUpdates(
    (event) => {
      const known = orders?.find((o) => o.id === event.orderId);
      if (known && known.status !== event.status) {
        show(`Booking ${orderRef(event.orderId)} is now ${event.status.toLowerCase()}`, {
          tone: event.status === 'CANCELLED' ? 'danger' : 'info',
          id: `order-${event.orderId}-${event.status}`,
        });
      }
      setOrders((current) =>
        current?.map((o) =>
          o.id === event.orderId ? { ...o, status: event.status, updatedAt: event.occurredAt } : o,
        ),
      );
      setFlash(event.orderId);
      later(() => setFlash((id) => (id === event.orderId ? null : id)), 1500);
      // The notification service handles the same event; give it a moment to send the email.
      later(loadNotifications, 500);
    },
    () => {
      // Status changes made while the connection was down never reach us; catch up.
      reloadOrders();
      loadNotifications();
    },
  );

  // Looked up from the live list so the dialog closes if the order is cancelled elsewhere.
  const confirming = orders?.find((o) => o.id === confirmingId && isCancellable(o)) ?? null;

  async function cancel(id: string) {
    setCancelling(true);
    setActionError(null);
    try {
      const updated = await cancelOrder(id);
      setOrders((current) => current?.map((o) => (o.id === id ? updated : o)));
      show(`Booking ${orderRef(id)} cancelled`, { id: `order-${id}-${updated.status}` });
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e));
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
        <OfflineBanner connected={live} />
        {error && <Alert onRetry={reloadOrders}>{error}</Alert>}
        {actionError && <Alert>{actionError}</Alert>}
        {orders === undefined && !error && <OrderListSkeleton />}
        {orders?.length === 0 && (
          <p className="muted">
            No bookings yet. <Link to="/">Find something to book.</Link>
          </p>
        )}
        {orders !== undefined && orders.length > 0 && (
          <div className="chips order-filters" role="group" aria-label="Filter by status">
            {[null, ...STATUSES].map((s) => {
              const count = s ? orders.filter((o) => o.status === s).length : orders.length;
              return (
                <button
                  key={s ?? 'all'}
                  type="button"
                  className={`chip ${s === status ? 'active' : ''}`}
                  aria-pressed={s === status}
                  onClick={() => setStatus(s)}
                >
                  {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}{' '}
                  <span className="chip-count">{count}</span>
                </button>
              );
            })}
          </div>
        )}
        {status && orders !== undefined && orders.length > 0 && shown?.length === 0 && (
          <div className="empty-filter">
            <p className="muted">No {status.toLowerCase()} bookings.</p>
            <Button variant="ghost" onClick={() => setStatus(null)}>
              Show all bookings
            </Button>
          </div>
        )}
        <div className="stack">
          {shown?.map((o) => (
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

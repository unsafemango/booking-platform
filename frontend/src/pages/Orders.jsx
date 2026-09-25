import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';
import { api, money } from '../lib/api.js';
import { useOrderUpdates } from '../lib/useOrderUpdates.js';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [flash, setFlash] = useState(null);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(() => {
    api('/api/notifications').then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    api('/api/orders').then(setOrders).catch((e) => setError(e.message));
    loadNotifications();
  }, [loadNotifications]);

  const live = useOrderUpdates((event) => {
    setOrders((current) =>
      current?.map((o) => (o.id === event.orderId ? { ...o, status: event.status, updatedAt: event.occurredAt } : o)),
    );
    setFlash(event.orderId);
    setTimeout(() => setFlash((id) => (id === event.orderId ? null : id)), 1500);
    // The notification service handles the same event; give it a moment to send the email.
    setTimeout(loadNotifications, 500);
  });

  async function cancel(id) {
    try {
      const updated = await api(`/api/orders/${id}/cancel`, { method: 'POST' });
      setOrders((current) => current.map((o) => (o.id === id ? updated : o)));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="orders-layout">
      <section>
        <div className="page-head row">
          <h1>My bookings</h1>
          <span className={`live ${live ? 'on' : ''}`}>{live ? 'Live' : 'Connecting…'}</span>
        </div>
        {error && <p className="alert">{error}</p>}
        {orders?.length === 0 && (
          <p className="muted">No bookings yet. <Link to="/">Find something to book.</Link></p>
        )}
        <div className="stack">
          {orders?.map((o) => (
            <article key={o.id} className={`card order ${flash === o.id ? 'flash' : ''}`}>
              <div className="order-head">
                <div>
                  <span className="mono">#{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className="muted"> · {new Date(o.createdAt).toLocaleString()}</span>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <ul className="order-items">
                {o.items.map((i) => (
                  <li key={i.productId}>
                    <span>{i.quantity} × {i.productName}</span>
                    <span>{money(i.unitPrice * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="order-foot">
                <strong>{money(o.total)}</strong>
                {(o.status === 'PLACED' || o.status === 'CONFIRMED') && (
                  <button className="btn btn-ghost danger" onClick={() => cancel(o.id)}>Cancel</button>
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
    </div>
  );
}

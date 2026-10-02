import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { useCart } from '../lib/cart.tsx';
import type { Order, PlaceOrderRequest } from '../types.ts';

export default function Cart() {
  const { lines, total, setQuantity, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    if (!user) {
      navigate('/login?next=/cart');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: PlaceOrderRequest = {
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      };
      await api<Order>('/api/orders', { method: 'POST', body });
      clear();
      navigate('/orders');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <section className="empty">
        <h1>Your cart is empty</h1>
        <Link to="/" className="btn">Browse bookings</Link>
      </section>
    );
  }

  return (
    <section className="narrow">
      <h1>Cart</h1>
      <div className="card">
        {lines.map(({ product, quantity }) => (
          <div key={product.id} className="line">
            <div>
              <strong>{product.name}</strong>
              <div className="muted">{money(product.price)} each</div>
            </div>
            <div className="qty">
              <button className="btn btn-ghost" aria-label="Remove one" onClick={() => setQuantity(product.id, quantity - 1)}>−</button>
              <span>{quantity}</span>
              <button
                className="btn btn-ghost"
                aria-label="Add one"
                disabled={quantity >= product.stock}
                onClick={() => setQuantity(product.id, quantity + 1)}
              >+</button>
            </div>
            <strong className="line-total">{money(product.price * quantity)}</strong>
          </div>
        ))}
        <div className="line total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      {error && <p className="alert">{error}</p>}
      <div className="actions">
        <button className="btn btn-ghost" onClick={clear}>Clear</button>
        <button className="btn" onClick={checkout} disabled={submitting}>
          {submitting ? 'Booking…' : user ? 'Book now' : 'Log in to book'}
        </button>
      </div>
    </section>
  );
}

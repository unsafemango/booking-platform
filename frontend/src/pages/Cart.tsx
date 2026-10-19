import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import { api, ApiError, money, orderRef } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { useCart, type CartLine } from '../lib/cart.tsx';
import { useToast } from '../lib/toast.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import type { Order, PlaceOrderRequest, Product } from '../types.ts';

/** Reloads every product in the cart; products that fail to load are left out. */
async function fetchLatest(lines: CartLine[]): Promise<Product[]> {
  const results = await Promise.allSettled(
    lines.map((l) => api<Product>(`/api/products/${l.product.id}`)),
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
}

function shortLabel(stock: number): string {
  return stock <= 0 ? 'Sold out' : `Only ${stock} left`;
}

export default function Cart() {
  const { lines, total, setQuantity, refresh, clear } = useCart();
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDocumentTitle('Cart');

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
      const order = await api<Order>('/api/orders', { method: 'POST', body });
      clear();
      show(`Booking ${orderRef(order.id)} placed`, {
        tone: 'success',
        id: `order-${order.id}-${order.status}`,
      });
      navigate('/orders');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      if (e instanceof ApiError && e.status === 409) {
        // Someone else booked first: show current availability next to each line.
        const latest = await fetchLatest(lines);
        refresh(latest);
        const short = latest.some((p) => {
          const line = lines.find((l) => l.product.id === p.id);
          return line !== undefined && line.quantity > p.stock;
        });
        if (short) setError(`${e.message.replace(/\.?$/, '.')} Adjust the items marked below.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <section className="empty">
        <h1>Your cart is empty</h1>
        <Link to="/" className="btn">
          Browse bookings
        </Link>
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
              {quantity > product.stock && (
                <div className="stock low">{shortLabel(product.stock)}</div>
              )}
            </div>
            <div className="qty">
              <Button
                variant="ghost"
                aria-label="Remove one"
                onClick={() => setQuantity(product.id, quantity - 1)}
              >
                −
              </Button>
              <span>{quantity}</span>
              <Button
                variant="ghost"
                aria-label="Add one"
                disabled={quantity >= product.stock}
                onClick={() => setQuantity(product.id, quantity + 1)}
              >
                +
              </Button>
            </div>
            <strong className="line-total">{money(product.price * quantity)}</strong>
          </div>
        ))}
        <div className="line total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="actions">
        <Button variant="ghost" onClick={clear}>
          Clear
        </Button>
        <Button onClick={checkout} disabled={submitting}>
          {submitting ? 'Booking…' : user ? 'Book now' : 'Log in to book'}
        </Button>
      </div>
    </section>
  );
}

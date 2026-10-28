import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import { placeOrder } from '../api/orders.ts';
import { getProduct } from '../api/products.ts';
import { ApiError, money, orderRef } from '../lib/api.ts';
import { useAuth } from '../lib/auth.tsx';
import { useCart, type CartLine } from '../lib/cart.tsx';
import { useToast } from '../lib/toast.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import type { PlaceOrderRequest, Product } from '../types.ts';

interface LatestProducts {
  products: Product[];
  /** Lines whose product the catalog no longer has (404). */
  missing: CartLine[];
}

/**
 * Reloads every product in the cart. Products that fail to load for another reason
 * (network, server error) are left out of both lists, so their lines stay as they are.
 */
async function fetchLatest(lines: CartLine[]): Promise<LatestProducts> {
  const results = await Promise.allSettled(lines.map((l) => getProduct(l.product.id)));
  const latest: LatestProducts = { products: [], missing: [] };
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') latest.products.push(r.value);
    else if (r.reason instanceof ApiError && r.reason.status === 404) latest.missing.push(lines[i]);
  });
  return latest;
}

/** Notice for lines dropped because their product was removed from the catalog. */
function removedNotice(missing: CartLine[]): string {
  const names = new Intl.ListFormat('en').format(missing.map((l) => l.product.name));
  return missing.length === 1
    ? `${names} is no longer available and was removed from your cart.`
    : `${names} are no longer available and were removed from your cart.`;
}

/** Availability shown under a cart line; a warning when the line asks for more than is left. */
function stockLabel(stock: number, quantity: number): string {
  if (stock <= 0) return 'Sold out';
  return quantity > stock ? `Only ${stock} left` : `${stock} available`;
}

interface QuantityInputProps {
  name: string;
  quantity: number;
  stock: number;
  onChange: (quantity: number) => void;
}

/**
 * Typed quantity for a cart line. The value is applied on blur or Enter and kept
 * between 1 and the available stock; anything that isn't a number is reverted.
 */
function QuantityInput({ name, quantity, stock, onChange }: QuantityInputProps) {
  const [draft, setDraft] = useState(String(quantity));
  const [shown, setShown] = useState(quantity);
  // Follow changes made elsewhere (the +/− buttons, a stock refresh).
  if (shown !== quantity) {
    setShown(quantity);
    setDraft(String(quantity));
  }

  const max = Math.max(1, stock);

  function commit() {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(quantity));
      return;
    }
    const next = Math.min(Math.max(parsed, 1), max);
    setDraft(String(next));
    if (next !== quantity) onChange(next);
  }

  return (
    <input
      type="number"
      className="input qty-input"
      inputMode="numeric"
      min={1}
      max={max}
      step={1}
      aria-label={`Quantity of ${name}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
}

export default function Cart() {
  const { lines, total, setQuantity, refresh, clear } = useCart();
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string | null>(null);
  useDocumentTitle('Cart');

  async function checkout() {
    if (!user) {
      navigate('/login?next=/cart');
      return;
    }
    setSubmitting(true);
    setError(null);
    setRemoved(null);
    try {
      const body: PlaceOrderRequest = {
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      };
      const order = await placeOrder(body);
      clear();
      show(`Booking ${orderRef(order.id)} placed`, {
        tone: 'success',
        id: `order-${order.id}-${order.status}`,
      });
      navigate('/orders');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) {
        // Someone else booked first, or a product was taken off the catalog: show current
        // availability next to each line and drop the lines that can't be booked any more.
        const { products, missing } = await fetchLatest(lines);
        refresh(
          products,
          missing.map((l) => l.product.id),
        );
        if (missing.length > 0) setRemoved(removedNotice(missing));
        const short = products.some((p) => {
          const line = lines.find((l) => l.product.id === p.id);
          return line !== undefined && line.quantity > p.stock;
        });
        if (short) setError(`${e.message.replace(/\.?$/, '.')} Adjust the items marked below.`);
        else if (missing.length > 0) setError(null);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <section className="empty">
        <h1>Your cart is empty</h1>
        {removed && <Alert>{removed}</Alert>}
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
              <div
                className={`stock ${quantity > product.stock || product.stock < 5 ? 'low' : ''}`}
              >
                {stockLabel(product.stock, quantity)}
              </div>
            </div>
            <div className="qty">
              <Button
                variant="ghost"
                aria-label="Remove one"
                onClick={() => setQuantity(product.id, quantity - 1)}
              >
                −
              </Button>
              <QuantityInput
                name={product.name}
                quantity={quantity}
                stock={product.stock}
                onChange={(next) => setQuantity(product.id, next)}
              />
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
      {removed && <Alert>{removed}</Alert>}
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

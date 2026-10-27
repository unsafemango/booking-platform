import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { money } from '../lib/api.ts';
import { useCart } from '../lib/cart.tsx';

/** Small dropdown next to the Cart link that lists what's in the cart without leaving the page. */
export default function CartSummary() {
  const { lines, total } = useCart();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close after navigating, e.g. through the "View cart" link.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="cart-summary" ref={rootRef}>
      <button
        ref={toggleRef}
        type="button"
        className="cart-summary-toggle"
        aria-label="Cart summary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id={panelId} className="cart-summary-panel" role="region" aria-label="Cart summary">
          {lines.length === 0 ? (
            <p className="muted">Your cart is empty.</p>
          ) : (
            <>
              <ul className="cart-summary-lines">
                {lines.map((l) => (
                  <li key={l.product.id}>
                    <span>
                      {l.product.name} <span className="muted">× {l.quantity}</span>
                    </span>
                    <span>{money(Number(l.product.price) * l.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="cart-summary-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </p>
            </>
          )}
          <Link to="/cart" className="btn" onClick={() => setOpen(false)}>
            View cart
          </Link>
        </div>
      )}
    </div>
  );
}

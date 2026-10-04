import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '../types.ts';

const CART_KEY = 'booking.cart';

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface CartContextValue {
  lines: CartLine[];
  /** Total number of units across all lines. */
  count: number;
  total: number;
  add: (product: Product) => void;
  /** Sets a line's quantity; zero or less removes the line. */
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartLine[] {
  try {
    const stored = localStorage.getItem(CART_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable; the cart just won't survive a reload
    }
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    const setQuantity = (productId: string, quantity: number) =>
      setLines((current) =>
        quantity <= 0
          ? current.filter((l) => l.product.id !== productId)
          : current.map((l) => (l.product.id === productId ? { ...l, quantity } : l)),
      );

    return {
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      total: lines.reduce((sum, l) => sum + Number(l.product.price) * l.quantity, 0),
      add: (product) =>
        setLines((current) =>
          current.some((l) => l.product.id === product.id)
            ? current.map((l) =>
                l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l,
              )
            : [...current, { product, quantity: 1 }],
        ),
      setQuantity,
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

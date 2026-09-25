import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CART_KEY = 'booking.cart';
const CartContext = createContext(null);

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable; the cart just won't survive a reload
    }
  }, [lines]);

  const value = useMemo(() => {
    const setQuantity = (productId, quantity) =>
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
            ? current.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
            : [...current, { product, quantity: 1 }],
        ),
      setQuantity,
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);

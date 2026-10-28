import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../types.ts';
import { CartProvider, useCart } from './cart.tsx';

const CART_KEY = 'booking.cart';

function product(id: string, price: number): Product {
  return {
    id,
    name: `Product ${id}`,
    description: null,
    category: 'test',
    price,
    stock: 10,
    imageUrl: null,
  };
}

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

function renderCart() {
  return renderHook(() => useCart(), { wrapper });
}

/** What the browser fires in this tab when another tab writes to storage. */
function sendStorageEvent(key: string | null, storageArea: Storage = localStorage) {
  window.dispatchEvent(new StorageEvent('storage', { key, storageArea }));
}

describe('cart context', () => {
  it('starts empty', () => {
    const { result } = renderCart();
    expect(result.current.lines).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('adds a product and increments it when added again', () => {
    const { result } = renderCart();
    const a = product('a', 5);

    act(() => result.current.add(a));
    act(() => result.current.add(a));

    expect(result.current.lines).toEqual([{ product: a, quantity: 2 }]);
    expect(result.current.count).toBe(2);
  });

  it('computes count and total across lines', () => {
    const { result } = renderCart();

    act(() => {
      result.current.add(product('a', 2.5));
      result.current.add(product('b', 10));
      result.current.add(product('b', 10));
    });

    expect(result.current.count).toBe(3);
    expect(result.current.total).toBe(22.5);
  });

  it('sets a line quantity without touching other lines', () => {
    const { result } = renderCart();

    act(() => {
      result.current.add(product('a', 1));
      result.current.add(product('b', 1));
    });
    act(() => result.current.setQuantity('a', 4));

    expect(result.current.lines.map((l) => [l.product.id, l.quantity])).toEqual([
      ['a', 4],
      ['b', 1],
    ]);
  });

  it('removes a line when its quantity drops to zero or below', () => {
    const { result } = renderCart();

    act(() => {
      result.current.add(product('a', 1));
      result.current.add(product('b', 1));
    });
    act(() => result.current.setQuantity('a', 0));
    expect(result.current.lines.map((l) => l.product.id)).toEqual(['b']);

    act(() => result.current.setQuantity('b', -1));
    expect(result.current.lines).toEqual([]);
  });

  it('refreshes product details of matching lines and keeps quantities', () => {
    const { result } = renderCart();
    act(() => {
      result.current.add(product('a', 1));
      result.current.add(product('a', 1));
      result.current.add(product('b', 2));
    });

    const updated = { ...product('a', 1.5), stock: 1 };
    act(() => result.current.refresh([updated, product('z', 9)]));

    expect(result.current.lines).toEqual([
      { product: updated, quantity: 2 },
      { product: product('b', 2), quantity: 1 },
    ]);
    expect(result.current.total).toBe(5);
  });

  it('drops lines for products that no longer exist when refreshing', () => {
    const { result } = renderCart();
    act(() => {
      result.current.add(product('a', 1));
      result.current.add(product('b', 2));
    });

    const updated = { ...product('b', 3), stock: 4 };
    act(() => result.current.refresh([updated], ['a']));

    expect(result.current.lines).toEqual([{ product: updated, quantity: 1 }]);
    expect(result.current.count).toBe(1);
  });

  it('clears all lines', () => {
    const { result } = renderCart();

    act(() => result.current.add(product('a', 1)));
    act(() => result.current.clear());

    expect(result.current.lines).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('persists the cart to localStorage and restores it on mount', () => {
    const first = renderCart();
    act(() => first.result.current.add(product('a', 3)));

    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? 'null')).toEqual([
      { product: product('a', 3), quantity: 1 },
    ]);
    first.unmount();

    const second = renderCart();
    expect(second.result.current.lines).toEqual([{ product: product('a', 3), quantity: 1 }]);
    expect(second.result.current.total).toBe(3);
  });

  it('ignores corrupt or non-array stored data', () => {
    localStorage.setItem(CART_KEY, '{not json');
    expect(renderCart().result.current.lines).toEqual([]);

    localStorage.setItem(CART_KEY, '{"a":1}');
    expect(renderCart().result.current.lines).toEqual([]);
  });

  it('adopts the cart another tab saved', () => {
    const { result } = renderCart();
    act(() => result.current.add(product('a', 1)));

    const other = [{ product: product('b', 4), quantity: 3 }];
    localStorage.setItem(CART_KEY, JSON.stringify(other));
    act(() => sendStorageEvent(CART_KEY));

    expect(result.current.lines).toEqual(other);
    expect(result.current.count).toBe(3);
    expect(result.current.total).toBe(12);
  });

  it('empties the cart when another tab clears storage', () => {
    const { result } = renderCart();
    act(() => result.current.add(product('a', 1)));

    localStorage.clear();
    act(() => sendStorageEvent(null));

    expect(result.current.lines).toEqual([]);
  });

  it('ignores storage events for other keys and session storage', () => {
    const { result } = renderCart();
    act(() => result.current.add(product('a', 1)));
    localStorage.setItem(CART_KEY, JSON.stringify([{ product: product('b', 4), quantity: 1 }]));

    act(() => sendStorageEvent('booking.theme'));
    act(() => sendStorageEvent(CART_KEY, sessionStorage));

    expect(result.current.lines).toEqual([{ product: product('a', 1), quantity: 1 }]);
  });

  it('stops listening for other tabs once unmounted', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    renderCart().unmount();

    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used inside <CartProvider>');
  });
});

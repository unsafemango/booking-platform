import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
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

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used inside <CartProvider>');
  });
});

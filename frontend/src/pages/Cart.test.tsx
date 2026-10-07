import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import { AuthProvider } from '../lib/auth.tsx';
import { CartProvider, type CartLine } from '../lib/cart.tsx';
import type { Order, Product, User } from '../types.ts';
import Cart from './Cart.tsx';

const CART_KEY = 'booking.cart';
const USER_KEY = 'booking.user';

const user: User = { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'CUSTOMER' };

const loft: Product = {
  id: 'p1',
  name: 'Harbour Loft',
  description: 'Two nights by the water',
  category: 'Stays',
  price: 240,
  stock: 2,
  imageUrl: null,
};
const kayak: Product = {
  id: 'p2',
  name: 'Kayak Tour',
  description: 'Half a day on the river',
  category: 'Experiences',
  price: 55.5,
  stock: 5,
  imageUrl: null,
};

const placed: Order = {
  id: 'o1',
  status: 'PLACED',
  total: 591,
  items: [
    { productId: 'p1', productName: 'Harbour Loft', unitPrice: 240, quantity: 2 },
    { productId: 'p2', productName: 'Kayak Tour', unitPrice: 55.5, quantity: 2 },
  ],
  createdAt: '2026-10-07T12:00:00Z',
  updatedAt: '2026-10-07T12:00:00Z',
};

function fillCart(lines: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

function signIn() {
  tokenStore.set('jwt-123');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

/** Stands in for the pages Cart navigates to, showing where it landed. */
function Location() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{pathname + search}</p>;
}

function renderCart() {
  return render(
    <AuthProvider>
      <CartProvider>
        <MemoryRouter initialEntries={['/cart']}>
          <Routes>
            <Route path="/cart" element={<Cart />} />
            <Route path="*" element={<Location />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </AuthProvider>,
  );
}

describe('Cart checkout', () => {
  it('shows the empty state when there is nothing to book', () => {
    renderCart();

    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse bookings' })).toHaveAttribute('href', '/');
  });

  it('sends a logged-out visitor to log in and back to the cart', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fillCart([{ product: loft, quantity: 1 }]);
    renderCart();

    fireEvent.click(screen.getByRole('button', { name: 'Log in to book' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=/cart');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? 'null')).toHaveLength(1);
  });

  it('posts the order, clears the cart and opens the orders page', async () => {
    const fetchMock = mockFetch(201, placed);
    signIn();
    fillCart([
      { product: loft, quantity: 2 },
      { product: kayak, quantity: 2 },
    ]);
    renderCart();

    expect(screen.getByText('$591.00')).toBeInTheDocument();
    const book = screen.getByRole('button', { name: 'Book now' });
    fireEvent.click(book);
    expect(book).toHaveTextContent('Booking…');
    expect(book).toBeDisabled();

    expect(await screen.findByTestId('location')).toHaveTextContent('/orders');
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/orders');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
    expect(JSON.parse(init?.body as string)).toEqual({
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 2 },
      ],
    });
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? 'null')).toEqual([]);
  });

  it('keeps the cart and shows the message when stock is short (409)', async () => {
    mockFetch(409, { error: 'Not enough stock for Harbour Loft' });
    signIn();
    fillCart([{ product: loft, quantity: 2 }]);
    renderCart();

    fireEvent.click(screen.getByRole('button', { name: 'Book now' }));

    expect(await screen.findByText('Not enough stock for Harbour Loft')).toHaveClass('alert');
    expect(screen.getByRole('button', { name: 'Book now' })).toBeEnabled();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? 'null')).toEqual([
      { product: loft, quantity: 2 },
    ]);
  });
});

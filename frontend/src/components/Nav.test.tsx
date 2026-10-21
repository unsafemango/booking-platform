import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import { AuthProvider } from '../lib/auth.tsx';
import { CartProvider, type CartLine } from '../lib/cart.tsx';
import type { Product, User } from '../types.ts';
import Nav from './Nav.tsx';

const ada: User = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  role: 'CUSTOMER',
};
const loft: Product = {
  id: 'p1',
  name: 'Harbour Loft',
  description: 'Two nights by the water',
  category: 'Stays',
  price: 240,
  stock: 12,
  imageUrl: null,
};
const kayak: Product = {
  id: 'p3',
  name: 'Kayak Tour',
  description: 'Half a day on the river',
  category: 'Experiences',
  price: 55,
  stock: 4,
  imageUrl: null,
};

function signIn(user: User) {
  tokenStore.set('jwt-123');
  localStorage.setItem('booking.user', JSON.stringify(user));
}

function seedCart(lines: CartLine[]) {
  localStorage.setItem('booking.cart', JSON.stringify(lines));
}

function Location() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderNav(path = '/orders') {
  return render(
    <AuthProvider>
      <CartProvider>
        <MemoryRouter initialEntries={[path]}>
          <Nav />
          <Routes>
            <Route path="*" element={<Location />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </AuthProvider>,
  );
}

describe('Nav', () => {
  it('shows only public links and a log in link to visitors', () => {
    renderNav('/');

    expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute('href', '/cart');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'My bookings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('shows the number of units in the cart', () => {
    seedCart([
      { product: loft, quantity: 2 },
      { product: kayak, quantity: 3 },
    ]);
    renderNav();

    expect(screen.getByRole('link', { name: 'Cart 5' })).toHaveAttribute('href', '/cart');
  });

  it('hides the count when the cart is empty', () => {
    renderNav();

    const cart = screen.getByRole('link', { name: 'Cart' });
    expect(cart.querySelector('.pill')).toBeNull();
  });

  it('shows account links and the name of a signed-in customer', () => {
    signIn(ada);
    renderNav();

    expect(screen.getByRole('link', { name: 'My bookings' })).toHaveAttribute('href', '/orders');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('shows the admin link to admins', () => {
    signIn({ ...ada, role: 'ADMIN' });
    renderNav();

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('marks the current page link as active', () => {
    signIn(ada);
    renderNav('/orders');

    expect(screen.getByRole('link', { name: 'My bookings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Browse' })).not.toHaveAttribute('aria-current');
  });

  it('logs out, clears the session and goes home', () => {
    signIn(ada);
    renderNav('/orders');

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My bookings' })).not.toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
    expect(localStorage.getItem('booking.user')).toBeNull();
  });
});

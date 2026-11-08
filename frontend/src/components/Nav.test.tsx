import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { money, tokenStore } from '../lib/api.ts';
import { AuthProvider } from '../lib/auth.tsx';
import { CartProvider, type CartLine } from '../lib/cart.tsx';
import { markNotificationsRead, notificationKey } from '../lib/notificationsRead.ts';
import type { Notification, Product, User } from '../types.ts';
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

  it.each([
    ['/cart', '/login?next=%2Fcart'],
    ['/?q=loft&sort=price', '/login?next=%2F%3Fq%3Dloft%26sort%3Dprice'],
    ['/products/p1#details', '/login?next=%2Fproducts%2Fp1%23details'],
    ['/login', '/login'],
    ['/login?next=%2Fcart', '/login?next=%2Fcart'],
    ['/register?next=%2Fcart', '/login?next=%2Fcart'],
  ])('on %s the log in link goes to %s', (path, href) => {
    renderNav(path);

    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', href);
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

  it('opens a cart summary with each line and the total', () => {
    seedCart([
      { product: loft, quantity: 2 },
      { product: kayak, quantity: 1 },
    ]);
    renderNav();

    const toggle = screen.getByRole('button', { name: 'Cart summary' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('region', { name: 'Cart summary' });
    const items = within(panel).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Harbour Loft × 2');
    expect(items[1]).toHaveTextContent('Kayak Tour × 1');
    expect(within(panel).getByText('Total').parentElement).toHaveTextContent(money(535));
  });

  it('says so when the cart is empty', () => {
    renderNav();

    fireEvent.click(screen.getByRole('button', { name: 'Cart summary' }));

    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('closes the summary on Escape and returns focus to the toggle', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: 'Cart summary' });
    fireEvent.click(toggle);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('region', { name: 'Cart summary' })).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('closes the summary on a click outside it', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Cart summary' }));

    fireEvent.pointerDown(screen.getByTestId('location'));

    expect(screen.queryByRole('region', { name: 'Cart summary' })).not.toBeInTheDocument();
  });

  it('goes to the cart and closes the summary from "View cart"', () => {
    renderNav('/');
    fireEvent.click(screen.getByRole('button', { name: 'Cart summary' }));

    fireEvent.click(screen.getByRole('link', { name: 'View cart' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/cart$/);
    expect(screen.queryByRole('region', { name: 'Cart summary' })).not.toBeInTheDocument();
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

  describe('unread email badge', () => {
    const placed: Notification = {
      orderId: 'o1',
      type: 'order.placed',
      status: 'PLACED',
      subject: 'We got your booking',
      sentAt: '2026-10-06T09:01:00Z',
    };
    const confirmed: Notification = {
      ...placed,
      type: 'order.status-changed',
      status: 'CONFIRMED',
      subject: 'Your booking is confirmed',
      sentAt: '2026-10-06T10:00:00Z',
    };

    function mockNotifications(list: Notification[]) {
      return vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => new Response(JSON.stringify(list), { status: 200 }));
    }

    it('shows the number of unread emails on the bookings link', async () => {
      mockNotifications([placed, confirmed]);
      localStorage.setItem('booking.notificationsRead', JSON.stringify([notificationKey(placed)]));
      signIn(ada);
      renderNav('/');

      const link = await screen.findByRole('link', { name: 'My bookings 1 unread email' });
      expect(link).toHaveAttribute('href', '/orders');
    });

    it('hides the badge when every email has been read', async () => {
      const fetchMock = mockNotifications([placed]);
      localStorage.setItem('booking.notificationsRead', JSON.stringify([notificationKey(placed)]));
      signIn(ada);
      renderNav('/');

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(screen.getByRole('link', { name: 'My bookings' }).querySelector('.pill')).toBeNull();
    });

    it('updates when emails are marked as read elsewhere in the app', async () => {
      mockNotifications([placed, confirmed]);
      signIn(ada);
      renderNav('/');
      await screen.findByRole('link', { name: 'My bookings 2 unread emails' });

      act(() => {
        markNotificationsRead([placed, confirmed], [placed, confirmed]);
      });

      expect(screen.getByRole('link', { name: 'My bookings' }).querySelector('.pill')).toBeNull();
    });

    it('does not ask for emails when nobody is signed in', () => {
      const fetchMock = mockNotifications([placed]);
      renderNav('/');

      expect(fetchMock).not.toHaveBeenCalled();
    });
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

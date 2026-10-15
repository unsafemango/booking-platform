import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App.tsx';
import { tokenStore } from './lib/api.ts';
import { AuthProvider } from './lib/auth.tsx';
import { CartProvider } from './lib/cart.tsx';
import { ToastProvider } from './lib/toast.tsx';
import type { Product, User } from './types.ts';

const USER_KEY = 'booking.user';

const customer: User = { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'CUSTOMER' };
const admin: User = { id: 'u2', email: 'grace@example.com', name: 'Grace', role: 'ADMIN' };

const loft: Product = {
  id: 'p1',
  name: 'Harbour Loft',
  description: 'Two nights by the water',
  category: 'Stays',
  price: 240,
  stock: 2,
  imageUrl: null,
};

function logInAs(user: User) {
  tokenStore.set('jwt-123');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <App />
            <LocationProbe />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('/admin route guard', () => {
  it('sends logged-out visitors to the login page and back to /admin afterwards', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    renderAt('/admin');

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fadmin');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a permission message to customers without loading the catalog', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    logInAs(customer);
    renderAt('/admin');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'You need an administrator account to view this page.',
    );
    expect(screen.queryByRole('heading', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets admins in and shows the Admin nav link', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([loft]), { status: 200 }),
    );
    logInAs(admin);
    renderAt('/admin');

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(await screen.findByRole('link', { name: 'Harbour Loft' })).toBeInTheDocument();
  });
});

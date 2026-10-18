import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import { AuthProvider } from '../lib/auth.tsx';
import { makeJwt } from '../test/jwt.ts';
import type { User } from '../types.ts';
import SessionExpiryWarning, { WARN_BEFORE_MS } from './SessionExpiryWarning.tsx';

const user: User = { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'CUSTOMER' };

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderWarning(expiresInMs: number) {
  tokenStore.set(makeJwt(Date.now() + expiresInMs));
  localStorage.setItem('booking.user', JSON.stringify(user));
  return render(
    <MemoryRouter initialEntries={['/orders']}>
      <AuthProvider>
        <SessionExpiryWarning />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('SessionExpiryWarning', () => {
  beforeEach(() => {
    // Start on a whole second so the JWT's exp (in seconds) matches exactly.
    vi.useFakeTimers({ now: 1_800_000_000_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays hidden until shortly before expiry, then counts down', () => {
    renderWarning(10 * 60_000);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(10 * 60_000 - WARN_BEFORE_MS));
    expect(screen.getByRole('alert')).toHaveTextContent('Your session expires in 2 minutes');

    act(() => vi.advanceTimersByTime(75_000));
    expect(screen.getByRole('alert')).toHaveTextContent('less than a minute');
  });

  it('shows straight away when the session is already close to expiring', () => {
    renderWarning(30_000);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('disappears when the session expires and the user is logged out', () => {
    renderWarning(60_000);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('can be dismissed', () => {
    renderWarning(60_000);
    act(() => vi.advanceTimersByTime(0));

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(tokenStore.get()).not.toBeNull();
  });

  it('signs out and sends the user to login, returning to the current page', () => {
    renderWarning(60_000);
    act(() => vi.advanceTimersByTime(0));

    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }));

    expect(tokenStore.get()).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Forders');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders nothing for a token without an expiry', () => {
    tokenStore.set('jwt-123');
    localStorage.setItem('booking.user', JSON.stringify(user));
    render(
      <MemoryRouter>
        <AuthProvider>
          <SessionExpiryWarning />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

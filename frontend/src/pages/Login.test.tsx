import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import { AuthProvider } from '../lib/auth.tsx';
import type { AuthResponse, User } from '../types.ts';
import Login from './Login.tsx';

const USER_KEY = 'booking.user';

const ada: User = { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'CUSTOMER' };
const session: AuthResponse = { token: 'jwt-123', expiresIn: 3600, user: ada };

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

/** Stands in for the pages Login navigates to, showing where it landed. */
function Location() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{pathname + search}</p>;
}

function renderLogin(entry = '/login') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function fillAndSubmit(email = 'ada@example.com', password = 'secret123') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('Login page', () => {
  it('sets the page title and focuses the email field', () => {
    renderLogin();

    expect(document.title).toBe('Log in · Booking Platform');
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('posts the credentials, stores the session and goes home', async () => {
    const fetchMock = mockFetch(200, session);
    renderLogin();

    fillAndSubmit();

    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/$/);
    expect(String(fetchMock.mock.lastCall?.[0])).toBe('/api/auth/login');
    expect(fetchMock.mock.lastCall?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(fetchMock.mock.lastCall?.[1]?.body))).toEqual({
      email: 'ada@example.com',
      password: 'secret123',
    });
    expect(tokenStore.get()).toBe('jwt-123');
    expect(JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')).toEqual(ada);
  });

  it('returns to the next param after logging in', async () => {
    mockFetch(200, session);
    renderLogin('/login?next=/cart');

    fillAndSubmit();

    expect(await screen.findByTestId('location')).toHaveTextContent('/cart');
  });

  it('disables the button while the request is in flight', async () => {
    let respond: (res: Response) => void = () => {};
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    );
    renderLogin();

    fillAndSubmit();

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    respond(new Response(JSON.stringify(session), { status: 200 }));
    expect(await screen.findByTestId('location')).toBeInTheDocument();
  });

  it('shows the error and stays on the page when the login is rejected', async () => {
    mockFetch(401, { error: 'Invalid email or password' });
    renderLogin();

    fillAndSubmit('ada@example.com', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('clears the previous error when submitting again', async () => {
    const fetchMock = mockFetch(401, { error: 'Invalid email or password' });
    renderLogin();

    fillAndSubmit('ada@example.com', 'wrong');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fetchMock.mockResolvedValue(new Response(JSON.stringify(session), { status: 200 }));
    fillAndSubmit();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByTestId('location')).toBeInTheDocument();
  });

  it('links to sign up, keeping the next param', () => {
    renderLogin('/login?next=/cart');

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/register?next=/cart',
    );
  });

  it('links to sign up without a next param when none was given', () => {
    renderLogin();

    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
  });
});

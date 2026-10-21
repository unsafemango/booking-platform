import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import { AuthProvider } from '../lib/auth.tsx';
import type { AuthResponse, User } from '../types.ts';
import Register from './Register.tsx';

const USER_KEY = 'booking.user';

const ada: User = { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'CUSTOMER' };
const session: AuthResponse = { token: 'jwt-123', expiresIn: 3600, user: ada };

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

/** Stands in for the pages Register navigates to, showing where it landed. */
function Location() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{pathname + search}</p>;
}

function renderRegister(entry = '/register') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function fillAndSubmit({ name = 'Ada', email = 'ada@example.com', password = 'secret123' } = {}) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
}

describe('Register page', () => {
  it('sets the page title and focuses the name field', () => {
    renderRegister();

    expect(document.title).toBe('Create an account · Booking Platform');
    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(screen.getByLabelText('Password')).toHaveAttribute('minLength', '8');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('posts the new account, stores the session and goes home', async () => {
    const fetchMock = mockFetch(201, session);
    renderRegister();

    fillAndSubmit();

    expect(await screen.findByTestId('location')).toHaveTextContent(/^\/$/);
    expect(String(fetchMock.mock.lastCall?.[0])).toBe('/api/auth/register');
    expect(fetchMock.mock.lastCall?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(fetchMock.mock.lastCall?.[1]?.body))).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'secret123',
    });
    expect(tokenStore.get()).toBe('jwt-123');
    expect(JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')).toEqual(ada);
  });

  it('returns to the next param after signing up', async () => {
    mockFetch(201, session);
    renderRegister('/register?next=/cart');

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
    renderRegister();

    fillAndSubmit();

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
    respond(new Response(JSON.stringify(session), { status: 201 }));
    expect(await screen.findByTestId('location')).toBeInTheDocument();
  });

  it('shows field errors next to their inputs and focuses the first one', async () => {
    mockFetch(400, {
      error: 'Validation failed',
      fields: { email: 'must be a well-formed email address', password: 'size must be 8+' },
    });
    renderRegister();

    fillAndSubmit({ email: 'ada@example', password: 'short' });

    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('must be a well-formed email address');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('size must be 8+');
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
    // The summary alert is left out when every error has a field to sit next to.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('shows errors without fields as an alert', async () => {
    mockFetch(409, { error: 'Email is already registered' });
    renderRegister();

    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Email is already registered');
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('clears old field errors when submitting again', async () => {
    const fetchMock = mockFetch(400, {
      error: 'Validation failed',
      fields: { email: 'must be a well-formed email address' },
    });
    renderRegister();

    fillAndSubmit({ email: 'ada@example' });
    expect(await screen.findByText('must be a well-formed email address')).toBeInTheDocument();

    fetchMock.mockResolvedValue(new Response(JSON.stringify(session), { status: 201 }));
    fillAndSubmit();

    expect(screen.queryByText('must be a well-formed email address')).not.toBeInTheDocument();
    expect(await screen.findByTestId('location')).toBeInTheDocument();
  });
});

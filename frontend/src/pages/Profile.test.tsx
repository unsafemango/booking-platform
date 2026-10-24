import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import type { User } from '../types.ts';
import Profile from './Profile.tsx';

const ada: User = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  role: 'CUSTOMER',
};

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

describe('Profile page', () => {
  beforeEach(() => {
    tokenStore.set('jwt-123');
  });

  it('loads the current user from /api/users/me', async () => {
    const fetchMock = mockFetch(200, ada);
    renderProfile();

    expect(screen.getByRole('status')).toHaveTextContent('Loading profile…');
    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(String(fetchMock.mock.lastCall?.[0])).toBe('/api/users/me');
    expect(fetchMock.mock.lastCall?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer jwt-123',
    });
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View my bookings' })).toHaveAttribute(
      'href',
      '/orders',
    );
  });

  it('labels admin accounts', async () => {
    mockFetch(200, { ...ada, role: 'ADMIN' });
    renderProfile();

    expect(await screen.findByText('Administrator')).toBeInTheDocument();
  });

  it('shows load errors', async () => {
    mockFetch(500, { error: 'Service unavailable' });
    renderProfile();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load your profile: Service unavailable",
    );
  });

  it('loads again when retry is clicked after an error', async () => {
    const fetchMock = mockFetch(500, { error: 'Service unavailable' });
    renderProfile();
    await screen.findByRole('alert');

    fetchMock.mockResolvedValue(new Response(JSON.stringify(ada), { status: 200 }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts the request when the page unmounts', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    const { unmount } = renderProfile();

    const signal = fetchMock.mock.lastCall?.[1]?.signal;
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});

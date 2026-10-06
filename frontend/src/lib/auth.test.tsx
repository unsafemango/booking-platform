import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthResponse, User } from '../types.ts';
import { ApiError, api, tokenStore } from './api.ts';
import { AuthProvider, useAuth } from './auth.tsx';

const USER_KEY = 'booking.user';

const user: User = { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'CUSTOMER' };
const authResponse: AuthResponse = { token: 'jwt-123', expiresIn: 3600, user };

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

function signIn() {
  tokenStore.set(authResponse.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

describe('auth context', () => {
  it('starts logged out', () => {
    expect(renderAuth().result.current.user).toBeNull();
  });

  it('logs in, stores the token and user, and exposes the user', async () => {
    const fetchMock = mockFetch(200, authResponse);
    const { result } = renderAuth();

    let returned: User | undefined;
    await act(async () => {
      returned = await result.current.login('ada@example.com', 'secret');
    });

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/auth/login');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      email: 'ada@example.com',
      password: 'secret',
    });
    expect(returned).toEqual(user);
    expect(result.current.user).toEqual(user);
    expect(tokenStore.get()).toBe('jwt-123');
    expect(JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')).toEqual(user);
  });

  it('registers and logs the new user in', async () => {
    const fetchMock = mockFetch(201, authResponse);
    const { result } = renderAuth();

    await act(async () => {
      await result.current.register('Ada', 'ada@example.com', 'secret');
    });

    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/auth/register');
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'secret',
    });
    expect(result.current.user).toEqual(user);
    expect(tokenStore.get()).toBe('jwt-123');
  });

  it('stays logged out when login fails', async () => {
    mockFetch(401, { error: 'Bad credentials' });
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.login('ada@example.com', 'wrong')).rejects.toBeInstanceOf(
        ApiError,
      );
    });

    expect(result.current.user).toBeNull();
    expect(tokenStore.get()).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('restores the user on mount only when a token is stored', () => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    expect(renderAuth().result.current.user).toBeNull();

    tokenStore.set('jwt-123');
    expect(renderAuth().result.current.user).toEqual(user);
  });

  it('ignores a corrupt stored user', () => {
    tokenStore.set('jwt-123');
    localStorage.setItem(USER_KEY, '{not json');
    expect(renderAuth().result.current.user).toBeNull();
  });

  it('logs out and clears storage', () => {
    signIn();
    const { result } = renderAuth();

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(tokenStore.get()).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('logs out when the auth:expired event fires', () => {
    signIn();
    const { result } = renderAuth();
    expect(result.current.user).toEqual(user);

    act(() => {
      window.dispatchEvent(new Event('auth:expired'));
    });

    expect(result.current.user).toBeNull();
    expect(tokenStore.get()).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('logs out when an authenticated request gets a 401', async () => {
    signIn();
    mockFetch(401, { error: 'Token expired' });
    const { result } = renderAuth();

    await act(async () => {
      await expect(api('/api/orders')).rejects.toMatchObject({ status: 401 });
    });

    expect(result.current.user).toBeNull();
    expect(tokenStore.get()).toBeNull();
  });

  it('stops listening for auth:expired after unmount', () => {
    signIn();
    const { unmount } = renderAuth();
    unmount();

    window.dispatchEvent(new Event('auth:expired'));

    expect(tokenStore.get()).toBe('jwt-123');
  });

  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>');
  });
});

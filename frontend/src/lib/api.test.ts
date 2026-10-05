import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, money, tokenStore } from './api.ts';

function mockFetch(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), { status });
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
}

describe('money', () => {
  it('formats numbers as US dollars', () => {
    expect(money(12)).toBe('$12.00');
    expect(money(1234.5)).toBe('$1,234.50');
  });

  it('accepts numeric strings', () => {
    expect(money('9.99')).toBe('$9.99');
  });
});

describe('api', () => {
  afterEach(() => {
    tokenStore.clear();
  });

  it('returns the parsed body on success', async () => {
    const fetchMock = mockFetch(200, [{ id: 'p1' }]);

    await expect(api('/api/products')).resolves.toEqual([{ id: 'p1' }]);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/products');
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
  });

  it('sends the token and a JSON body', async () => {
    tokenStore.set('abc');
    const fetchMock = mockFetch(201, { id: 'o1' });

    await api('/api/orders', { method: 'POST', body: { items: [] } });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer abc',
      'Content-Type': 'application/json',
    });
    expect(init?.body).toBe('{"items":[]}');
  });

  it('resolves a 204 response to null', async () => {
    mockFetch(204);
    await expect(api('/api/products/p1', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('throws an ApiError with the server message and field errors', async () => {
    mockFetch(400, { error: 'Validation failed', fields: { email: 'must be valid' } });

    const err = await api('/api/auth/register').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      message: 'Validation failed',
      fields: { email: 'must be valid' },
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Gateway', { status: 502 }));
    await expect(api('/api/products')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502)',
    });
  });

  it('dispatches auth:expired on a 401 when a token was sent', async () => {
    tokenStore.set('stale');
    mockFetch(401, { error: 'Unauthorized' });
    const listener = vi.fn();
    window.addEventListener('auth:expired', listener);

    await expect(api('/api/orders')).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:expired', listener);
  });

  it('does not dispatch auth:expired on a 401 without a token', async () => {
    mockFetch(401, { error: 'Bad credentials' });
    const listener = vi.fn();
    window.addEventListener('auth:expired', listener);

    await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('auth:expired', listener);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelOrder } from './orders.ts';
import { deleteProduct, getProduct, listProducts, updateProduct } from './products.ts';

function mockFetch(status: number, body?: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() =>
      Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status })),
    );
}

const product = {
  name: 'Lake cabin',
  description: null,
  category: 'Stays',
  price: 120,
  stock: 3,
  imageUrl: null,
};

describe('resource modules', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves empty product filters out of the query string', async () => {
    const fetchMock = mockFetch(200, []);

    await listProducts();
    await listProducts({ q: '', category: undefined });
    await listProducts({ q: 'lake view', category: 'Stays' });

    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/products',
      '/api/products',
      '/api/products?q=lake+view&category=Stays',
    ]);
  });

  it('encodes ids in resource paths', async () => {
    const fetchMock = mockFetch(200, {});

    await getProduct('a/b');
    await cancelOrder('o 1');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/products/a%2Fb');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/orders/o%201/cancel');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');
  });

  it('uses PUT with the product body for updates and DELETE for removal', async () => {
    const fetchMock = mockFetch(200, { id: 'p1', ...product });
    await updateProduct('p1', product);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify(product),
    });

    fetchMock.mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(deleteProduct('p1')).resolves.toBeNull();
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
  });
});

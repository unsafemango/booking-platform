import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../lib/cart.tsx';
import type { Product } from '../types.ts';
import ProductDetail from './ProductDetail.tsx';

const CART_KEY = 'booking.cart';

const loft: Product = {
  id: 'p1',
  name: 'Harbour Loft',
  description: 'Two nights by the water',
  category: 'Stays',
  price: 240,
  stock: 2,
  imageUrl: null,
};

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function renderDetail(id = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/products/${id}`]}>
      <CartProvider>
        <Routes>
          <Route path="/products/:id" element={<ProductDetail />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('Product detail page', () => {
  it('loads the product by id and shows its details', async () => {
    const fetchMock = mockFetch(200, loft);
    renderDetail();

    expect(screen.getByRole('status')).toHaveTextContent('Loading listing…');
    expect(await screen.findByRole('heading', { name: 'Harbour Loft' })).toBeInTheDocument();
    expect(String(fetchMock.mock.lastCall?.[0])).toBe('/api/products/p1');
    expect(screen.getByText('Two nights by the water')).toBeInTheDocument();
    expect(screen.getByText('$240.00')).toBeInTheDocument();
    expect(screen.getByText('2 available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← All listings' })).toHaveAttribute('href', '/');
  });

  it('adds to the cart and stops at the available stock', async () => {
    mockFetch(200, loft);
    renderDetail();
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another (1)' }));
    expect(screen.getByRole('button', { name: 'Add another (2)' })).toBeDisabled();

    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? 'null')).toEqual([
      { product: loft, quantity: 2 },
    ]);
  });

  it('disables adding a sold-out product', async () => {
    mockFetch(200, { ...loft, stock: 0 });
    renderDetail();

    expect(await screen.findByText('Sold out')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  it('shows a not-found message for an unknown id', async () => {
    mockFetch(404, { error: 'Product not found' });
    renderDetail('missing');

    expect(await screen.findByRole('heading', { name: 'Listing not found' })).toBeInTheDocument();
  });

  it('shows the error when loading fails', async () => {
    mockFetch(503, { error: 'Service unavailable' });
    renderDetail();

    expect(
      await screen.findByText("Couldn't load this listing: Service unavailable"),
    ).toBeInTheDocument();
  });

  it('lists other recently viewed products, but not the current one', async () => {
    localStorage.setItem(
      'booking.recentlyViewed',
      JSON.stringify([
        { id: 'p1', name: 'Harbour Loft', category: 'Stays', price: 240 },
        { id: 'p2', name: 'City Bike Tour', category: 'Tours', price: 45 },
      ]),
    );
    mockFetch(200, loft);
    renderDetail();
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    const section = screen.getByRole('region', { name: 'Recently viewed' });
    expect(within(section).getAllByRole('link')).toHaveLength(1);
    expect(within(section).getByRole('link', { name: 'City Bike Tour' })).toHaveAttribute(
      'href',
      '/products/p2',
    );
    expect(within(section).getByText('Tours · $45.00')).toBeInTheDocument();
  });

  it('records the viewed product and hides the section on a first visit', async () => {
    mockFetch(200, loft);
    renderDetail();
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    expect(screen.queryByRole('region', { name: 'Recently viewed' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('booking.recentlyViewed') ?? 'null')).toEqual([
      { id: 'p1', name: 'Harbour Loft', category: 'Stays', price: 240 },
    ]);
  });
});

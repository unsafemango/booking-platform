import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../lib/cart.tsx';
import type { Product } from '../types.ts';
import Products from './Products.tsx';

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
const kayak: Product = {
  id: 'p2',
  name: 'Kayak Tour',
  description: 'Half a day on the river',
  category: 'Experiences',
  price: 55.5,
  stock: 0,
  imageUrl: null,
};

/** Answers every catalog request with `respond(url)`, so each call gets a fresh Response. */
function mockCatalog(respond: (url: URL) => Product[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    return new Response(JSON.stringify(respond(url)), { status: 200 });
  });
}

function lastUrl(fetchMock: ReturnType<typeof mockCatalog>): URL {
  return new URL(String(fetchMock.mock.lastCall?.[0]), 'http://localhost');
}

function renderProducts() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <Products />
      </CartProvider>
    </MemoryRouter>,
  );
}

function card(name: string): HTMLElement {
  return screen.getByRole('heading', { name }).closest('article') as HTMLElement;
}

describe('Products page', () => {
  it('renders the catalog with price and stock', async () => {
    const fetchMock = mockCatalog(() => [loft, kayak]);
    renderProducts();

    expect(await screen.findByRole('heading', { name: 'Harbour Loft' })).toBeInTheDocument();
    expect(lastUrl(fetchMock).pathname).toBe('/api/products');
    expect(lastUrl(fetchMock).search).toBe('');

    const loftCard = card('Harbour Loft');
    expect(within(loftCard).getByText('$240.00')).toBeInTheDocument();
    expect(within(loftCard).getByText('2 available')).toBeInTheDocument();

    expect(within(loftCard).getByRole('link', { name: 'Harbour Loft' })).toHaveAttribute(
      'href',
      '/products/p1',
    );

    const kayakCard = card('Kayak Tour');
    expect(within(kayakCard).getByText('$55.50')).toBeInTheDocument();
    expect(within(kayakCard).getByText('Sold out')).toBeInTheDocument();
    expect(within(kayakCard).getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  it('shows a loading skeleton until the catalog arrives', async () => {
    mockCatalog(() => [loft]);
    renderProducts();

    expect(screen.getByRole('status')).toHaveTextContent('Loading products…');
    expect(await screen.findByRole('heading', { name: 'Harbour Loft' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an empty message when nothing matches', async () => {
    mockCatalog(() => []);
    renderProducts();

    expect(await screen.findByText('Nothing matches that search.')).toBeInTheDocument();
  });

  it('shows the error when the catalog fails to load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503 }),
    );
    renderProducts();

    expect(
      await screen.findByText("Couldn't load the catalog: Service unavailable"),
    ).toBeInTheDocument();
  });

  it('sends the search text as q', async () => {
    const fetchMock = mockCatalog((url) => (url.searchParams.get('q') ? [kayak] : [loft, kayak]));
    renderProducts();
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'kayak' } });

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Harbour Loft' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Kayak Tour' })).toBeInTheDocument();
    expect(lastUrl(fetchMock).searchParams.get('q')).toBe('kayak');
    expect(lastUrl(fetchMock).searchParams.has('category')).toBe(false);
  });

  it('filters by category and drops the filter again for All', async () => {
    const fetchMock = mockCatalog((url) => {
      const category = url.searchParams.get('category');
      return [loft, kayak].filter((p) => !category || p.category === category);
    });
    renderProducts();
    await screen.findByRole('heading', { name: 'Kayak Tour' });

    const stays = screen.getByRole('button', { name: 'Stays' });
    fireEvent.click(stays);

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Kayak Tour' })).not.toBeInTheDocument(),
    );
    expect(lastUrl(fetchMock).searchParams.get('category')).toBe('Stays');
    expect(stays).toHaveClass('active');

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(await screen.findByRole('heading', { name: 'Kayak Tour' })).toBeInTheDocument();
    expect(lastUrl(fetchMock).searchParams.has('category')).toBe(false);
    expect(stays).not.toHaveClass('active');
  });

  it('adds to the cart and stops at the available stock', async () => {
    mockCatalog(() => [loft]);
    renderProducts();
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    const again = screen.getByRole('button', { name: 'Add another (1)' });
    expect(again).toBeEnabled();

    fireEvent.click(again);
    expect(screen.getByRole('button', { name: 'Add another (2)' })).toBeDisabled();

    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? 'null')).toEqual([
      { product: loft, quantity: 2 },
    ]);
  });
});

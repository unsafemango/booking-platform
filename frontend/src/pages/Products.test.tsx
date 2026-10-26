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

function renderProducts(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
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
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503 }),
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

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search the catalog' }), {
      target: { value: 'kayak' },
    });

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
    expect(stays).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(await screen.findByRole('heading', { name: 'Kayak Tour' })).toBeInTheDocument();
    expect(lastUrl(fetchMock).searchParams.has('category')).toBe(false);
    expect(stays).not.toHaveClass('active');
  });

  it('starts from the filters in the URL', async () => {
    const fetchMock = mockCatalog(() => [loft]);
    renderProducts('/?q=loft&category=Stays');
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    expect(screen.getByRole('searchbox', { name: 'Search the catalog' })).toHaveValue('loft');
    expect(screen.getByRole('button', { name: 'Stays' })).toHaveAttribute('aria-pressed', 'true');
    expect(lastUrl(fetchMock).searchParams.get('q')).toBe('loft');
    expect(lastUrl(fetchMock).searchParams.get('category')).toBe('Stays');
  });

  it('ignores an unknown category in the URL', async () => {
    const fetchMock = mockCatalog(() => [loft, kayak]);
    renderProducts('/?category=Nope');
    await screen.findByRole('heading', { name: 'Kayak Tour' });

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(lastUrl(fetchMock).searchParams.has('category')).toBe(false);
  });

  it('builds the category chips from the catalog', async () => {
    const pottery: Product = { ...loft, id: 'p3', name: 'Pottery Class', category: 'Workshops' };
    mockCatalog(() => [loft, kayak, pottery]);
    renderProducts();
    await screen.findByRole('heading', { name: 'Pottery Class' });

    const chipRow = screen.getByRole('button', { name: 'All' }).parentElement as HTMLElement;
    const chips = within(chipRow)
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(chips).toEqual(['All', 'Experiences', 'Stays', 'Workshops']);
    expect(screen.queryByRole('button', { name: 'Events' })).not.toBeInTheDocument();
  });

  it('keeps every category chip when the URL starts on one category', async () => {
    mockCatalog((url) => {
      const category = url.searchParams.get('category');
      return [loft, kayak].filter((p) => !category || p.category === category);
    });
    renderProducts('/?category=Stays');

    expect(await screen.findByRole('button', { name: 'Experiences' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stays' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('heading', { name: 'Harbour Loft' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kayak Tour' })).not.toBeInTheDocument();
  });

  it('sorts by price and name on the client', async () => {
    const fetchMock = mockCatalog(() => [kayak, loft]);
    renderProducts('/?sort=price-desc');
    await screen.findByRole('heading', { name: 'Kayak Tour' });
    const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

    expect(names()).toEqual(['Harbour Loft', 'Kayak Tour']);
    expect(lastUrl(fetchMock).searchParams.has('sort')).toBe(false);

    const select = screen.getByRole('combobox', { name: 'Sort by' });
    fireEvent.change(select, { target: { value: 'price-asc' } });
    expect(names()).toEqual(['Kayak Tour', 'Harbour Loft']);

    fireEvent.change(select, { target: { value: 'name' } });
    expect(names()).toEqual(['Harbour Loft', 'Kayak Tour']);
  });

  it('keeps the server order for an unknown sort', async () => {
    mockCatalog(() => [kayak, loft]);
    renderProducts('/?sort=nope');
    await screen.findByRole('heading', { name: 'Kayak Tour' });

    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('featured');
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Kayak Tour',
      'Harbour Loft',
    ]);
  });

  it('filters by price range on the client', async () => {
    const fetchMock = mockCatalog(() => [kayak, loft]);
    renderProducts('/?min=100');
    await screen.findByRole('heading', { name: 'Harbour Loft' });
    const names = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);

    expect(names()).toEqual(['Harbour Loft']);
    expect(screen.getByRole('spinbutton', { name: 'Minimum price' })).toHaveValue(100);
    expect(lastUrl(fetchMock).searchParams.has('min')).toBe(false);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum price' }), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum price' }), {
      target: { value: '55.5' },
    });
    expect(names()).toEqual(['Kayak Tour']);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum price' }), {
      target: { value: '10' },
    });
    expect(names()).toEqual([]);
    expect(screen.getByText('Nothing matches that search.')).toBeInTheDocument();
  });

  it('ignores an invalid price bound in the URL', async () => {
    mockCatalog(() => [kayak, loft]);
    renderProducts('/?max=-5');
    await screen.findByRole('heading', { name: 'Kayak Tour' });

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
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

  it('focuses the search box when "/" is pressed', async () => {
    mockCatalog(() => [loft]);
    renderProducts('/?q=loft');
    await screen.findByRole('heading', { name: 'Harbour Loft' });
    const search = screen.getByRole('searchbox', { name: 'Search the catalog' });
    expect(search).not.toHaveFocus();

    const pressed = fireEvent.keyDown(document.body, { key: '/' });
    expect(pressed).toBe(false);
    expect(search).toHaveFocus();
    expect(search).toHaveAttribute('aria-keyshortcuts', '/');
  });

  it('leaves "/" alone while typing in another field or with a modifier', async () => {
    mockCatalog(() => [loft]);
    renderProducts();
    await screen.findByRole('heading', { name: 'Harbour Loft' });
    const search = screen.getByRole('searchbox', { name: 'Search the catalog' });
    const min = screen.getByRole('spinbutton', { name: 'Minimum price' });

    min.focus();
    expect(fireEvent.keyDown(min, { key: '/' })).toBe(true);
    expect(min).toHaveFocus();

    min.blur();
    expect(fireEvent.keyDown(document.body, { key: '/', ctrlKey: true })).toBe(true);
    expect(search).not.toHaveFocus();
  });
  it('toggles a favourite on a card and remembers it in this browser', async () => {
    mockCatalog(() => [loft, kayak]);
    const { unmount } = renderProducts();
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    const heart = within(card('Harbour Loft')).getByRole('button', {
      name: 'Favourite Harbour Loft',
    });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('booking.favourites') ?? '[]')).toEqual(['p1']);

    unmount();
    renderProducts();
    await screen.findByRole('heading', { name: 'Harbour Loft' });
    expect(
      within(card('Harbour Loft')).getByRole('button', { name: 'Favourite Harbour Loft' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(card('Kayak Tour')).getByRole('button', { name: 'Favourite Kayak Tour' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows only favourites when the filter is on and keeps it in the URL', async () => {
    localStorage.setItem('booking.favourites', JSON.stringify(['p2']));
    mockCatalog(() => [loft, kayak]);
    renderProducts();
    await screen.findByRole('heading', { name: 'Harbour Loft' });

    const filter = screen.getByRole('button', { name: 'Favourites only' });
    fireEvent.click(filter);
    expect(filter).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('heading', { name: 'Harbour Loft' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kayak Tour' })).toBeInTheDocument();

    fireEvent.click(
      within(card('Kayak Tour')).getByRole('button', { name: 'Favourite Kayak Tour' }),
    );
    expect(screen.getByText(/No favourites yet/)).toBeInTheDocument();

    fireEvent.click(filter);
    expect(filter).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: 'Harbour Loft' })).toBeInTheDocument();
  });

  it('starts with the favourites filter from the URL', async () => {
    localStorage.setItem('booking.favourites', JSON.stringify(['p1']));
    mockCatalog(() => [loft, kayak]);
    renderProducts('/?fav=1');
    await screen.findByRole('heading', { name: 'Harbour Loft' });
    expect(screen.getByRole('button', { name: 'Favourites only' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('heading', { name: 'Kayak Tour' })).not.toBeInTheDocument();
  });
});

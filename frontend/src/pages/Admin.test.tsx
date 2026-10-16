import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../types.ts';
import { ToastProvider } from '../lib/toast.tsx';
import Admin from './Admin.tsx';

const loft: Product = {
  id: 'p1',
  name: 'Harbour Loft',
  description: 'Two nights by the water',
  category: 'Stays',
  price: 240,
  stock: 12,
  imageUrl: null,
};
const cabin: Product = {
  id: 'p2',
  name: 'Alpine Cabin',
  description: 'A week in the mountains',
  category: 'Stays',
  price: 980.5,
  stock: 3,
  imageUrl: null,
};
const kayak: Product = {
  id: 'p3',
  name: 'Kayak Tour',
  description: 'Half a day on the river',
  category: 'Experiences',
  price: 55,
  stock: 0,
  imageUrl: null,
};

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function renderAdmin() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Admin catalog list', () => {
  it('lists products sorted by category then name', async () => {
    const fetchMock = mockFetch(200, [loft, kayak, cabin]);
    renderAdmin();

    expect(screen.getByRole('status')).toHaveTextContent('Loading catalog…');
    const table = await screen.findByRole('table', { name: 'Products in the catalog' });
    expect(String(fetchMock.mock.lastCall?.[0])).toBe('/api/products');

    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'Kayak Tour',
      'Alpine Cabin',
      'Harbour Loft',
    ]);
    expect(within(rows[1]).getByRole('link', { name: 'Alpine Cabin' })).toHaveAttribute(
      'href',
      '/products/p2',
    );
    expect(within(rows[1]).getByText('Stays')).toBeInTheDocument();
    expect(within(rows[1]).getByText('$980.50')).toBeInTheDocument();
  });

  it('highlights low and sold-out stock', async () => {
    mockFetch(200, [loft, kayak, cabin]);
    renderAdmin();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Sold out')).toHaveClass('stock', 'low');
    expect(within(table).getByText('3')).toHaveClass('stock', 'low');
    expect(within(table).getByText('12')).not.toHaveClass('low');
  });

  it('says so when the catalog is empty', async () => {
    mockFetch(200, []);
    renderAdmin();

    expect(await screen.findByText('The catalog is empty.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows load errors', async () => {
    mockFetch(500, { error: 'Service unavailable' });
    renderAdmin();

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

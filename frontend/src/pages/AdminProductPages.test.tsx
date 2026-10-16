import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../lib/toast.tsx';
import type { Product } from '../types.ts';
import AdminEditProduct from './AdminEditProduct.tsx';
import AdminNewProduct from './AdminNewProduct.tsx';

const loft: Product = {
  id: 'p1',
  name: 'Harbour Loft',
  description: 'Two nights by the water',
  category: 'Stays',
  price: 240,
  stock: 12,
  imageUrl: null,
};

/** Answers each fetch call in turn with the next [status, body] pair. */
function mockFetch(...responses: [number, unknown][]) {
  const spy = vi.spyOn(globalThis, 'fetch');
  for (const [status, body] of responses) {
    spy.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  }
  return spy;
}

function sentBody(fetchMock: ReturnType<typeof mockFetch>, call: number): unknown {
  const init = fetchMock.mock.calls[call]?.[1];
  return JSON.parse(String(init?.body));
}

function renderAt(path: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin" element={<h1>Catalog list</h1>} />
          <Route path="/admin/products/new" element={<AdminNewProduct />} />
          <Route path="/admin/products/:id/edit" element={<AdminEditProduct />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('Admin new product page', () => {
  it('posts the product, shows a toast and returns to the catalog', async () => {
    const fetchMock = mockFetch([201, { ...loft, id: 'p9' }]);
    renderAt('/admin/products/new');

    type('Name', ' Harbour Loft ');
    type('Category', 'Stays');
    type('Description', 'Two nights by the water');
    type('Price', '240');
    type('Stock', '12');
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByRole('heading', { name: 'Catalog list' })).toBeInTheDocument();
    expect(screen.getByText('Added Harbour Loft to the catalog')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/products');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(sentBody(fetchMock, 0)).toEqual({
      name: 'Harbour Loft',
      description: 'Two nights by the water',
      category: 'Stays',
      price: 240,
      stock: 12,
      imageUrl: null,
    });
  });

  it('does not call the API while the form is invalid', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    renderAt('/admin/products/new');

    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows field errors returned by the API and stays on the form', async () => {
    mockFetch([400, { error: 'Validation failed', fields: { name: 'Name is already taken.' } }]);
    renderAt('/admin/products/new');

    type('Name', 'Harbour Loft');
    type('Category', 'Stays');
    type('Price', '240');
    type('Stock', '12');
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByText('Name is already taken.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted fields.');
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Create product' })).toBeEnabled();
  });

  it('shows other errors as a message', async () => {
    mockFetch([403, { error: 'Admins only' }]);
    renderAt('/admin/products/new');

    type('Name', 'Harbour Loft');
    type('Category', 'Stays');
    type('Price', '240');
    type('Stock', '12');
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Admins only');
  });
});

describe('Admin edit product page', () => {
  it('prefills the form and saves changes with PUT', async () => {
    const fetchMock = mockFetch([200, loft], [200, { ...loft, price: 260 }]);
    renderAt('/admin/products/p1/edit');

    expect(screen.getByRole('status')).toHaveTextContent('Loading product…');
    expect(await screen.findByRole('heading', { name: 'Edit Harbour Loft' })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/products/p1');
    expect(screen.getByLabelText('Name')).toHaveValue('Harbour Loft');
    expect(screen.getByLabelText('Price')).toHaveValue('240');
    expect(screen.getByLabelText('Stock')).toHaveValue('12');

    type('Price', '260');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('heading', { name: 'Catalog list' })).toBeInTheDocument();
    expect(screen.getByText('Saved changes to Harbour Loft')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[1][0])).toBe('/api/products/p1');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');
    expect(sentBody(fetchMock, 1)).toEqual({
      name: 'Harbour Loft',
      description: 'Two nights by the water',
      category: 'Stays',
      price: 260,
      stock: 12,
      imageUrl: null,
    });
  });

  it('shows field errors returned by the API', async () => {
    mockFetch(
      [200, loft],
      [400, { error: 'Validation failed', fields: { stock: 'Stock is below booked units.' } }],
    );
    renderAt('/admin/products/p1/edit');

    await screen.findByRole('heading', { name: 'Edit Harbour Loft' });
    type('Stock', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Stock is below booked units.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted fields.');
    expect(screen.getByLabelText('Stock')).toHaveAttribute('aria-invalid', 'true');
  });

  it('says so when the product does not exist', async () => {
    mockFetch([404, { error: 'Product not found' }]);
    renderAt('/admin/products/missing/edit');

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('shows load errors', async () => {
    mockFetch([500, { error: 'Service unavailable' }]);
    renderAt('/admin/products/p1/edit');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this product: Service unavailable",
    );
  });
});

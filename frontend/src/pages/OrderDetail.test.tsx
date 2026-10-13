import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import { ToastProvider } from '../lib/toast.tsx';
import type { Order, OrderUpdateEvent } from '../types.ts';
import OrderDetail from './OrderDetail.tsx';

/** A stand-in for the Socket.IO client: tests fire server events by hand. */
const socket = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    on: (event: string, handler: Handler) => handlers.set(event, handler),
    close: () => {},
    emit: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  };
});

vi.mock('socket.io-client', () => ({ io: vi.fn(() => socket) }));

const loftOrder: Order = {
  id: 'aaaaaaaa-1111-4000-8000-000000000001',
  status: 'PLACED',
  total: 480,
  items: [{ productId: 'p1', productName: 'Harbour Loft', unitPrice: 240, quantity: 2 }],
  createdAt: '2026-10-07T12:00:00Z',
  updatedAt: '2026-10-07T12:00:00Z',
};

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

function statusUpdate(overrides: Partial<OrderUpdateEvent> = {}): OrderUpdateEvent {
  return {
    type: 'order.status-changed',
    orderId: loftOrder.id,
    status: 'CONFIRMED',
    previousStatus: 'PLACED',
    total: 480,
    occurredAt: '2026-10-07T12:05:00Z',
    ...overrides,
  };
}

function renderDetail(id = loftOrder.id) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/orders/${id}`]}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetail />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Order detail page', () => {
  beforeEach(() => {
    socket.handlers.clear();
    tokenStore.set('jwt-123');
  });

  it('loads the order by id and shows its details', async () => {
    const fetchMock = mockFetch(200, loftOrder);
    renderDetail();

    expect(screen.getByRole('status')).toHaveTextContent('Loading booking…');
    const heading = await screen.findByRole('heading', { name: 'Booking #AAAAAAAA' });
    expect(heading).toBeInTheDocument();
    expect(String(fetchMock.mock.lastCall?.[0])).toBe(`/api/orders/${loftOrder.id}`);
    expect(screen.getByText('placed')).toHaveClass('badge-placed');
    expect(screen.getByRole('link', { name: 'Harbour Loft' })).toHaveAttribute(
      'href',
      '/products/p1',
    );
    expect(screen.getByText('at $240.00')).toBeInTheDocument();
    expect(screen.getByText('Total $480.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← My bookings' })).toHaveAttribute('href', '/orders');
  });

  it('shows "not found" when the order does not exist', async () => {
    mockFetch(404, { error: 'Order not found' });
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Booking not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows other load errors', async () => {
    mockFetch(500, { error: 'Service unavailable' });
    renderDetail();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this booking: Service unavailable",
    );
  });

  it('cancels the order and hides the cancel button', async () => {
    const fetchMock = mockFetch(200, loftOrder);
    renderDetail();
    await screen.findByRole('heading', { name: 'Booking #AAAAAAAA' });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...loftOrder, status: 'CANCELLED' }), { status: 200 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Yes, cancel booking' }),
    );

    expect(await screen.findByText('Booking #AAAAAAAA cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/orders/${loftOrder.id}/cancel`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByText('cancelled')).toHaveClass('badge-cancelled');
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('asks for confirmation and keeps the booking when declined', async () => {
    const fetchMock = mockFetch(200, loftOrder);
    renderDetail();
    await screen.findByRole('heading', { name: 'Booking #AAAAAAAA' });
    const trigger = screen.getByRole('button', { name: 'Cancel booking' });
    trigger.focus();

    fireEvent.click(trigger);
    const dialog = screen.getByRole('alertdialog', { name: 'Cancel this booking?' });
    expect(dialog).toHaveAccessibleDescription(/#AAAAAAAA \(\$480\.00\) will be cancelled/);
    expect(within(dialog).getByRole('button', { name: 'Keep booking' })).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep booking' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('closes the confirmation if the order is cancelled elsewhere', async () => {
    mockFetch(200, loftOrder);
    renderDetail();
    await screen.findByRole('heading', { name: 'Booking #AAAAAAAA' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    act(() => socket.emit('order:update', statusUpdate({ status: 'CANCELLED' })));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the error when cancelling fails', async () => {
    const fetchMock = mockFetch(200, loftOrder);
    renderDetail();
    await screen.findByRole('heading', { name: 'Booking #AAAAAAAA' });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Order can no longer be cancelled' }), { status: 409 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel booking' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Order can no longer be cancelled');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeEnabled();
  });

  it('applies live status updates for this order only', async () => {
    mockFetch(200, loftOrder);
    renderDetail();
    await screen.findByRole('heading', { name: 'Booking #AAAAAAAA' });

    act(() => socket.emit('order:update', statusUpdate({ orderId: 'some-other-order' })));
    expect(screen.getByText('placed')).toBeInTheDocument();

    act(() => socket.emit('order:update', statusUpdate()));
    expect(screen.getByText('confirmed')).toHaveClass('badge-confirmed');
    const toasts = screen.getByRole('list', { name: 'Notifications' });
    expect(within(toasts).getByText('Booking #AAAAAAAA is now confirmed')).toBeInTheDocument();
  });
});

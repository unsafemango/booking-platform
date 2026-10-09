import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../lib/api.ts';
import { ToastProvider } from '../lib/toast.tsx';
import type { Notification, Order, OrderUpdateEvent } from '../types.ts';
import Orders from './Orders.tsx';

/** A stand-in for the Socket.IO client: tests fire server events by hand. */
const socket = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    options: undefined as unknown,
    on: (event: string, handler: Handler) => handlers.set(event, handler),
    close: () => {},
    emit: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn((options: unknown) => {
    socket.options = options;
    return socket;
  }),
}));

const loftOrder: Order = {
  id: 'aaaaaaaa-1111-4000-8000-000000000001',
  status: 'PLACED',
  total: 480,
  items: [{ productId: 'p1', productName: 'Harbour Loft', unitPrice: 240, quantity: 2 }],
  createdAt: '2026-10-07T12:00:00Z',
  updatedAt: '2026-10-07T12:00:00Z',
};
const kayakOrder: Order = {
  id: 'bbbbbbbb-2222-4000-8000-000000000002',
  status: 'CONFIRMED',
  total: 55.5,
  items: [{ productId: 'p2', productName: 'Kayak Tour', unitPrice: 55.5, quantity: 1 }],
  createdAt: '2026-10-06T09:00:00Z',
  updatedAt: '2026-10-06T09:30:00Z',
};

const confirmedEmail: Notification = {
  orderId: loftOrder.id,
  type: 'order.status-changed',
  status: 'CONFIRMED',
  subject: 'Your booking is confirmed',
  sentAt: '2026-10-07T12:05:00Z',
};

/** Answers GET /api/orders and GET /api/notifications; `notifications` is read on every call. */
function mockApi(orders: Order[], notifications: () => Notification[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const body = String(input) === '/api/orders' ? orders : notifications();
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

function orderCard(id: string) {
  const card = screen.getByText(`#${id.slice(0, 8).toUpperCase()}`).closest('article');
  if (!card) throw new Error(`No card for order ${id}`);
  return card;
}

function pushUpdate(event: OrderUpdateEvent) {
  act(() => socket.emit('order:update', event));
}

function renderOrders() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Orders live updates', () => {
  beforeEach(() => {
    socket.handlers.clear();
    tokenStore.set('jwt-123');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading skeleton until the orders arrive', async () => {
    mockApi([loftOrder], () => []);
    renderOrders();

    expect(screen.getByRole('status')).toHaveTextContent('Loading bookings…');
    await screen.findByText('Harbour Loft', { exact: false });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('connects with the stored token and shows the connection state', async () => {
    mockApi([loftOrder], () => []);
    renderOrders();
    await screen.findByText('Harbour Loft', { exact: false });

    expect(socket.options).toEqual({ auth: { token: 'jwt-123' } });
    expect(screen.getByText('Connecting…')).not.toHaveClass('on');

    act(() => socket.emit('connect'));
    expect(screen.getByText('Live')).toHaveClass('on');

    act(() => socket.emit('disconnect'));
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('changes the status of the matching order in place', async () => {
    mockApi([loftOrder, kayakOrder], () => []);
    renderOrders();
    await screen.findByText('Harbour Loft', { exact: false });
    vi.useFakeTimers();

    pushUpdate({
      type: 'order.status-changed',
      orderId: loftOrder.id,
      status: 'CONFIRMED',
      previousStatus: 'PLACED',
      total: 480,
      occurredAt: '2026-10-07T12:05:00Z',
    });

    const loft = orderCard(loftOrder.id);
    expect(within(loft).getByText('confirmed')).toHaveClass('badge-confirmed');
    expect(loft).toHaveClass('flash');
    // The rest of the order and the other order are left alone.
    expect(within(loft).getByText('$480.00', { selector: 'strong' })).toBeInTheDocument();
    expect(within(orderCard(kayakOrder.id)).getByText('confirmed')).toBeInTheDocument();
    expect(orderCard(kayakOrder.id)).not.toHaveClass('flash');
    expect(screen.getAllByRole('article')).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1500));
    expect(orderCard(loftOrder.id)).not.toHaveClass('flash');
  });

  it('announces a live status change once', async () => {
    mockApi([loftOrder], () => []);
    renderOrders();
    await screen.findByText('Harbour Loft', { exact: false });
    const confirmed: OrderUpdateEvent = {
      type: 'order.status-changed',
      orderId: loftOrder.id,
      status: 'CONFIRMED',
      previousStatus: 'PLACED',
      total: 480,
      occurredAt: '2026-10-07T12:05:00Z',
    };

    pushUpdate(confirmed);
    pushUpdate(confirmed);

    const toasts = screen.getByRole('list', { name: 'Notifications' });
    expect(within(toasts).getAllByRole('listitem')).toHaveLength(1);
    expect(within(toasts).getByText('Booking #AAAAAAAA is now confirmed')).toBeInTheDocument();
  });

  it('confirms a cancellation without a second toast from the live event', async () => {
    const fetchMock = mockApi([kayakOrder], () => []);
    renderOrders();
    await screen.findByText('Kayak Tour', { exact: false });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...kayakOrder, status: 'CANCELLED' }), { status: 200 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Booking #BBBBBBBB cancelled')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/orders/${kayakOrder.id}/cancel`,
      expect.objectContaining({ method: 'POST' }),
    );

    pushUpdate({
      type: 'order.status-changed',
      orderId: kayakOrder.id,
      status: 'CANCELLED',
      previousStatus: 'CONFIRMED',
      total: 55.5,
      occurredAt: '2026-10-07T13:00:00Z',
    });

    const toasts = screen.getByRole('list', { name: 'Notifications' });
    expect(within(toasts).getAllByRole('listitem')).toHaveLength(1);
  });

  it('hides the cancel button once an order is cancelled elsewhere', async () => {
    mockApi([kayakOrder], () => []);
    renderOrders();
    await screen.findByText('Kayak Tour', { exact: false });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    pushUpdate({
      type: 'order.status-changed',
      orderId: kayakOrder.id,
      status: 'CANCELLED',
      previousStatus: 'CONFIRMED',
      total: 55.5,
      occurredAt: '2026-10-07T13:00:00Z',
    });

    expect(within(orderCard(kayakOrder.id)).getByText('cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('ignores updates for orders that are not listed', async () => {
    mockApi([loftOrder], () => []);
    renderOrders();
    await screen.findByText('Harbour Loft', { exact: false });

    pushUpdate({
      type: 'order.placed',
      orderId: 'cccccccc-3333-4000-8000-000000000003',
      status: 'PLACED',
      previousStatus: null,
      total: 10,
      occurredAt: '2026-10-07T13:00:00Z',
    });

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(within(orderCard(loftOrder.id)).getByText('placed')).toBeInTheDocument();
  });

  it('reloads the sent emails shortly after an update', async () => {
    let emails: Notification[] = [];
    const fetchMock = mockApi([loftOrder], () => emails);
    renderOrders();
    expect(await screen.findByText('Nothing yet.')).toBeInTheDocument();
    vi.useFakeTimers();

    emails = [confirmedEmail];
    pushUpdate({
      type: 'order.status-changed',
      orderId: loftOrder.id,
      status: 'CONFIRMED',
      previousStatus: 'PLACED',
      total: 480,
      occurredAt: '2026-10-07T12:05:00Z',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe('/api/notifications');
    expect(screen.getByText('Your booking is confirmed')).toBeInTheDocument();
    expect(screen.queryByText('Nothing yet.')).not.toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

/** Shows the current query string, to check what the page keeps in the URL. */
function LocationProbe() {
  return <span data-testid="search">{useLocation().search}</span>;
}

function renderOrders(path = '/orders') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Orders />
        <LocationProbe />
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

  it('shows the offline banner only after a live connection drops', async () => {
    mockApi([loftOrder], () => []);
    renderOrders();
    await screen.findByText('Harbour Loft', { exact: false });
    expect(screen.queryByText(/Live updates are paused/)).not.toBeInTheDocument();

    act(() => socket.emit('connect'));
    expect(screen.queryByText(/Live updates are paused/)).not.toBeInTheDocument();

    act(() => socket.emit('disconnect'));
    expect(screen.getByText(/Live updates are paused/)).toBeInTheDocument();

    act(() => socket.emit('connect'));
    expect(screen.queryByText(/Live updates are paused/)).not.toBeInTheDocument();
  });

  it('refetches orders and emails on reconnect but not on the first connect', async () => {
    let orders = [loftOrder];
    let emails: Notification[] = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const body = String(input) === '/api/orders' ? orders : emails;
      return new Response(JSON.stringify(body), { status: 200 });
    });
    renderOrders();
    await screen.findByText('Nothing yet.');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    act(() => socket.emit('connect'));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    act(() => socket.emit('disconnect'));
    // Missed while offline: the status change and its email.
    orders = [{ ...loftOrder, status: 'CONFIRMED' }];
    emails = [confirmedEmail];
    act(() => socket.emit('connect'));

    expect(await screen.findByText('Your booking is confirmed')).toBeInTheDocument();
    expect(within(orderCard(loftOrder.id)).getByText('confirmed')).toHaveClass('badge-confirmed');
    const refetched = fetchMock.mock.calls.slice(2).map((call) => String(call[0]));
    expect(refetched.sort()).toEqual(['/api/notifications', '/api/orders']);
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
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel booking' }));
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

  it('does not cancel until the dialog is confirmed', async () => {
    const fetchMock = mockApi([kayakOrder], () => []);
    renderOrders();
    await screen.findByText('Kayak Tour', { exact: false });
    const calls = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Cancel this booking?' });
    expect(dialog).toHaveTextContent('#BBBBBBBB');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(calls);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
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

  it('drops pending reloads when the page unmounts', async () => {
    const fetchMock = mockApi([loftOrder], () => []);
    const { unmount } = renderOrders();
    expect(await screen.findByText('Nothing yet.')).toBeInTheDocument();
    vi.useFakeTimers();

    pushUpdate({
      type: 'order.status-changed',
      orderId: loftOrder.id,
      status: 'CONFIRMED',
      previousStatus: 'PLACED',
      total: 480,
      occurredAt: '2026-10-07T12:05:00Z',
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

/** n orders, newest first, with refs #00000001… and item names "Room 1"…, all PLACED. */
function manyOrders(n: number): Order[] {
  return Array.from({ length: n }, (_, i) => ({
    ...loftOrder,
    id: `${String(i + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
    items: [{ productId: `p${i + 1}`, productName: `Room ${i + 1}`, unitPrice: 10, quantity: 1 }],
    total: 10,
  }));
}

function chip(name: RegExp) {
  return within(screen.getByRole('group', { name: 'Filter by status' })).getByRole('button', {
    name,
  });
}

describe('Orders filters, search and pagination', () => {
  beforeEach(() => {
    socket.handlers.clear();
    tokenStore.set('jwt-123');
  });

  it('filters by status with counts on each chip and keeps it in ?status=', async () => {
    mockApi([loftOrder, kayakOrder], () => []);
    renderOrders();
    await screen.findByText('Harbour Loft', { exact: false });

    expect(chip(/^All/)).toHaveTextContent('All 2');
    expect(chip(/^Placed/)).toHaveTextContent('Placed 1');
    expect(chip(/^Cancelled/)).toHaveTextContent('Cancelled 0');
    expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(chip(/^Confirmed/));
    expect(chip(/^Confirmed/)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(orderCard(kayakOrder.id)).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?status=confirmed');

    fireEvent.click(chip(/^All/));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('reads the status filter from the URL and ignores unknown values', async () => {
    mockApi([loftOrder, kayakOrder], () => []);
    const { unmount } = renderOrders('/orders?status=PLACED');
    await screen.findByText('Harbour Loft', { exact: false });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(chip(/^Placed/)).toHaveAttribute('aria-pressed', 'true');
    unmount();

    renderOrders('/orders?status=bogus');
    await screen.findByText('Harbour Loft', { exact: false });
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true');
  });

  it('searches by reference or item name, highlights matches and updates the counts', async () => {
    mockApi([loftOrder, kayakOrder], () => []);
    renderOrders();
    await screen.findByText('Harbour Loft', { exact: false });
    const search = screen.getByRole('searchbox', { name: 'Search bookings by reference or item' });

    fireEvent.change(search, { target: { value: 'kayak' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(within(orderCard(kayakOrder.id)).getByText('Kayak').tagName).toBe('MARK');
    expect(chip(/^All/)).toHaveTextContent('All 1');
    expect(chip(/^Placed/)).toHaveTextContent('Placed 0');
    expect(screen.getByTestId('search')).toHaveTextContent('?q=kayak');

    // The reference matches with or without the leading #.
    fireEvent.change(search, { target: { value: '#aaaa' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Harbour Loft', { exact: false })).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'aaaa' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Harbour Loft', { exact: false })).toBeInTheDocument();
  });

  it('shows an empty state that clears the search and filter', async () => {
    mockApi([loftOrder, kayakOrder], () => []);
    renderOrders('/orders?status=cancelled&q=loft');
    await screen.findByRole('group', { name: 'Filter by status' });

    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('No cancelled bookings match "loft".')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all bookings' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('shows ten orders a page and pages with Previous and Next', async () => {
    mockApi(manyOrders(23), () => []);
    renderOrders();
    await screen.findAllByRole('article');
    const pager = screen.getByRole('navigation', { name: 'Bookings pages' });

    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(pager).toHaveTextContent('Page 1 of 3');
    expect(within(pager).getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(within(pager).getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Room 11', { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?page=2');

    fireEvent.click(within(pager).getByRole('button', { name: 'Next' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(pager).toHaveTextContent('Page 3 of 3');
    expect(within(pager).getByRole('button', { name: 'Next' })).toBeDisabled();

    fireEvent.click(within(pager).getByRole('button', { name: 'Previous' }));
    fireEvent.click(within(pager).getByRole('button', { name: 'Previous' }));
    expect(pager).toHaveTextContent('Page 1 of 3');
    // Page 1 is the default, so it is left out of the URL.
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('hides the pager when everything fits on one page', async () => {
    mockApi(manyOrders(10), () => []);
    renderOrders();
    await screen.findAllByRole('article');
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.queryByRole('navigation', { name: 'Bookings pages' })).not.toBeInTheDocument();
  });

  it('clamps an out-of-range ?page= to the last page', async () => {
    mockApi(manyOrders(15), () => []);
    renderOrders('/orders?page=9');
    await screen.findByText('Room 15', { exact: false });
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getByRole('navigation', { name: 'Bookings pages' })).toHaveTextContent(
      'Page 2 of 2',
    );
  });

  it('goes back to the first page when the search or filter changes', async () => {
    mockApi(manyOrders(23), () => []);
    renderOrders('/orders?page=3');
    await screen.findByText('Room 21', { exact: false });

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'room' } });
    expect(screen.getByTestId('search')).toHaveTextContent('?q=room');
    expect(screen.getByRole('navigation', { name: 'Bookings pages' })).toHaveTextContent(
      'Page 1 of 3',
    );

    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: 'Next' }));
    fireEvent.click(chip(/^Placed/));
    expect(screen.getByTestId('search')).toHaveTextContent('?q=room&status=placed');
  });
});

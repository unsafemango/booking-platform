import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Order, OrderStatus } from '../types.ts';
import OrderTimeline from './OrderTimeline.tsx';

function order(status: OrderStatus): Order {
  return {
    id: 'aaaaaaaa-1111-4000-8000-000000000001',
    status,
    total: 480,
    items: [],
    createdAt: '2026-10-07T12:00:00Z',
    updatedAt: '2026-10-07T13:00:00Z',
  };
}

function steps() {
  const list = screen.getByRole('list', { name: 'Booking progress' });
  return within(list).getAllByRole('listitem');
}

describe('OrderTimeline', () => {
  it('marks a placed booking as the first step with the rest to come', () => {
    render(<OrderTimeline order={order('PLACED')} />);

    const [placed, confirmed, completed] = steps();
    expect(placed).toHaveAttribute('aria-current', 'step');
    expect(placed.querySelector('time')).toHaveAttribute('datetime', '2026-10-07T12:00:00.000Z');
    expect(confirmed).toHaveTextContent('Confirmed (not yet)');
    expect(completed).toHaveClass('timeline-upcoming');
    expect(confirmed.querySelector('time')).toBeNull();
  });

  it('shows earlier steps as done and dates the current one by the last update', () => {
    render(<OrderTimeline order={order('CONFIRMED')} />);

    const [placed, confirmed, completed] = steps();
    expect(placed).toHaveClass('timeline-done');
    expect(placed).not.toHaveAttribute('aria-current');
    expect(confirmed).toHaveAttribute('aria-current', 'step');
    expect(confirmed.querySelector('time')).toHaveAttribute('datetime', '2026-10-07T13:00:00.000Z');
    expect(completed).toHaveClass('timeline-upcoming');
  });

  it('ends at completed with nothing upcoming', () => {
    render(<OrderTimeline order={order('COMPLETED')} />);

    const items = steps();
    expect(items.map((item) => item.className)).toEqual([
      expect.stringContaining('timeline-done'),
      expect.stringContaining('timeline-done'),
      expect.stringContaining('timeline-current'),
    ]);
    expect(screen.queryByText(/not yet/)).not.toBeInTheDocument();
  });

  it('replaces the remaining steps with cancelled', () => {
    render(<OrderTimeline order={order('CANCELLED')} />);

    const items = steps();
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Placed');
    expect(items[1]).toHaveTextContent('Cancelled');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
  });
});

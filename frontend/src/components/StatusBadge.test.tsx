import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OrderStatus } from '../types.ts';
import StatusBadge from './StatusBadge.tsx';

describe('StatusBadge', () => {
  const statuses: OrderStatus[] = ['PLACED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  it.each(statuses)('shows %s in lower case with a matching class', (status) => {
    render(<StatusBadge status={status} />);

    const badge = screen.getByText(status.toLowerCase());
    expect(badge).toHaveClass('badge', `badge-${status.toLowerCase()}`);
  });
});

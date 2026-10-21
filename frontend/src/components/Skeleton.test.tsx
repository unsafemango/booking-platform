import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderListSkeleton, PageLoading, ProductGridSkeleton } from './Skeleton.tsx';

describe('ProductGridSkeleton', () => {
  it('announces loading and hides the placeholder cards from screen readers', () => {
    const { container } = render(<ProductGridSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading products…');
    const grid = container.querySelector('.grid');
    expect(grid).toHaveAttribute('aria-hidden', 'true');
    expect(grid?.querySelectorAll('.card')).toHaveLength(6);
  });

  it('renders the requested number of cards', () => {
    const { container } = render(<ProductGridSkeleton count={2} />);

    expect(container.querySelectorAll('.grid .card')).toHaveLength(2);
  });
});

describe('OrderListSkeleton', () => {
  it('announces loading and hides the placeholder orders from screen readers', () => {
    const { container } = render(<OrderListSkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading bookings…');
    const list = container.querySelector('.stack');
    expect(list).toHaveAttribute('aria-hidden', 'true');
    expect(list?.querySelectorAll('.card.order')).toHaveLength(3);
  });

  it('renders the requested number of orders', () => {
    const { container } = render(<OrderListSkeleton count={5} />);

    expect(container.querySelectorAll('.stack .card.order')).toHaveLength(5);
  });
});

describe('PageLoading', () => {
  it('only renders a screen-reader status message', () => {
    const { container } = render(<PageLoading />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading page…');
    expect(status).toHaveClass('sr-only');
    expect(container.children).toHaveLength(1);
  });
});

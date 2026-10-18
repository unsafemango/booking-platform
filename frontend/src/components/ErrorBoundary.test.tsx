import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary.tsx';

let shouldThrow = true;

function Bomb() {
  if (shouldThrow) throw new Error('Kaboom');
  return <p>Page content</p>;
}

function renderBoundary(resetKey = '/a') {
  const ui = (key: string) => (
    <MemoryRouter>
      <ErrorBoundary resetKey={key}>
        <Bomb />
      </ErrorBoundary>
    </MemoryRouter>
  );
  const result = render(ui(resetKey));
  return { ...result, rerenderWith: (key: string) => result.rerender(ui(key)) };
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React and the boundary both log caught errors; keep the test output quiet.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders its children when nothing throws', () => {
    shouldThrow = false;
    renderBoundary();

    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a fallback with a way back to the catalog when a child throws', () => {
    renderBoundary();

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('link', { name: 'Browse bookings' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  });

  it('logs the caught error', () => {
    renderBoundary();

    expect(console.error).toHaveBeenCalledWith(
      'Unhandled error while rendering the page',
      expect.objectContaining({ message: 'Kaboom' }),
      expect.any(String),
    );
  });

  it('renders the children again after "Try again" once the problem is gone', () => {
    renderBoundary();
    shouldThrow = false;

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the fallback again if "Try again" still fails', () => {
    renderBoundary();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('clears the error when the reset key changes', () => {
    const { rerenderWith } = renderBoundary('/a');
    shouldThrow = false;

    rerenderWith('/a');
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerenderWith('/b');
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

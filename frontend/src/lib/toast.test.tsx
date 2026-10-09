import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION, ToastProvider, useToast, type ToastContextValue } from './toast.tsx';

let toast: ToastContextValue;

function Capture() {
  toast = useToast();
  return null;
}

function region() {
  return screen.getByRole('list', { name: 'Notifications' });
}

describe('toasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Capture />
      </ToastProvider>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a message in a polite live region', () => {
    act(() => toast.show('Booking placed', { tone: 'success' }));

    expect(region()).toHaveAttribute('aria-live', 'polite');
    expect(within(region()).getByText('Booking placed').closest('li')).toHaveClass(
      'toast toast-success',
    );
  });

  it('dismisses itself after a few seconds', () => {
    act(() => toast.show('Booking placed'));

    act(() => vi.advanceTimersByTime(TOAST_DURATION - 1));
    expect(screen.getByText('Booking placed')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Booking placed')).not.toBeInTheDocument();
  });

  it('can be dismissed by hand', () => {
    act(() => {
      toast.show('First');
      toast.show('Second');
    });

    fireEvent.click(within(screen.getByText('First').closest('li')!).getByLabelText('Dismiss'));

    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('replaces a toast with the same id instead of stacking it', () => {
    act(() => toast.show('Booking is now cancelled', { id: 'order-1-CANCELLED' }));
    act(() => vi.advanceTimersByTime(TOAST_DURATION - 1000));
    act(() => toast.show('Booking cancelled', { id: 'order-1-CANCELLED' }));

    expect(within(region()).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Booking cancelled')).toBeInTheDocument();
    // The replacement gets a full duration of its own.
    act(() => vi.advanceTimersByTime(TOAST_DURATION - 1));
    expect(screen.getByText('Booking cancelled')).toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow('inside <ToastProvider>');
  });
});

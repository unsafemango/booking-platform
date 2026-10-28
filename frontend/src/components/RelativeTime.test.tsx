import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatRelative } from '../lib/relativeTime.ts';
import RelativeTime from './RelativeTime.tsx';

const now = new Date('2026-10-07T12:00:00Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe('formatRelative', () => {
  it('says "just now" for the last few seconds', () => {
    expect(formatRelative(ago(10), now)).toBe('just now');
  });

  it('picks the largest fitting unit', () => {
    expect(formatRelative(ago(5 * 60), now)).toBe('5 minutes ago');
    expect(formatRelative(ago(3 * 60 * 60), now)).toBe('3 hours ago');
    expect(formatRelative(ago(24 * 60 * 60), now)).toBe('yesterday');
    expect(formatRelative(ago(14 * 24 * 60 * 60), now)).toBe('2 weeks ago');
    expect(formatRelative(ago(400 * 24 * 60 * 60), now)).toBe('last year');
  });

  it('handles dates in the future', () => {
    expect(formatRelative(ago(-2 * 60 * 60), now)).toBe('in 2 hours');
  });
});

describe('RelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a time element with the full date on hover', () => {
    vi.useFakeTimers({ now });
    render(<RelativeTime value="2026-10-07T11:55:00Z" />);

    const time = screen.getByText('5 minutes ago');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2026-10-07T11:55:00.000Z');
    expect(time).toHaveAttribute('title', new Date('2026-10-07T11:55:00Z').toLocaleString());
  });

  it('refreshes as time passes', () => {
    vi.useFakeTimers({ now });
    render(<RelativeTime value="2026-10-07T11:59:50Z" />);
    expect(screen.getByText('just now')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  it('falls back to the raw value for an invalid date', () => {
    render(<RelativeTime value="not a date" />);
    expect(screen.getByText('not a date')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OfflineBanner from './OfflineBanner.tsx';

const message = /Live updates are paused/;

describe('OfflineBanner', () => {
  it('stays hidden during the first connect', () => {
    render(<OfflineBanner connected={false} />);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('stays hidden while connected', () => {
    render(<OfflineBanner connected />);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('shows once a connection drops and hides when it is back', () => {
    const { rerender } = render(<OfflineBanner connected={false} />);
    rerender(<OfflineBanner connected />);
    rerender(<OfflineBanner connected={false} />);
    expect(screen.getByRole('status')).toHaveTextContent(message);

    rerender(<OfflineBanner connected />);
    expect(screen.queryByText(message)).not.toBeInTheDocument();

    rerender(<OfflineBanner connected={false} />);
    expect(screen.getByRole('status')).toHaveTextContent(message);
  });
});

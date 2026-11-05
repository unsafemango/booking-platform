import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../lib/toast.tsx';
import CopyButton, { COPIED_DURATION } from './CopyButton.tsx';

function renderButton() {
  return render(
    <ToastProvider>
      <CopyButton text="#AAAAAAAA" label="Copy reference" />
    </ToastProvider>,
  );
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

describe('CopyButton', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    vi.useRealTimers();
  });

  it('copies the text, says so, then resets', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    renderButton();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy reference' }));
    });

    expect(writeText).toHaveBeenCalledWith('#AAAAAAAA');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('#AAAAAAAA copied');

    act(() => vi.advanceTimersByTime(COPIED_DURATION));
    expect(screen.getByRole('button', { name: 'Copy reference' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the text in a toast when the clipboard refuses', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'Copy reference' }));

    const toasts = await screen.findByRole('list', { name: 'Notifications' });
    expect(
      within(toasts).getByText("Couldn't copy to the clipboard. It's #AAAAAAAA"),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy reference' })).toBeInTheDocument();
  });

  it('falls back to the toast when there is no clipboard API', async () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'Copy reference' }));

    expect(await screen.findByText(/Couldn't copy to the clipboard/)).toBeInTheDocument();
  });
});

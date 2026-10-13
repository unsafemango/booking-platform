import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.tsx';

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Delete it?"
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    >
      <p>This can't be undone.</p>
    </ConfirmDialog>,
  );
  return { onConfirm, onCancel, dialog: screen.queryByRole('alertdialog') };
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    const { dialog } = renderDialog({ open: false });
    expect(dialog).not.toBeInTheDocument();
  });

  it('is a labelled modal that focuses the safe choice', () => {
    const { dialog } = renderDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Delete it?');
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
    expect(screen.getByRole('button', { name: 'Go back' })).toHaveFocus();
  });

  it('confirms and cancels through the buttons, Escape and the backdrop', () => {
    const { onConfirm, onCancel, dialog } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    fireEvent.keyDown(dialog!, { key: 'Escape' });
    fireEvent.mouseDown(dialog!);
    expect(onCancel).toHaveBeenCalledTimes(2);
    fireEvent.mouseDown(dialog!.parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it('keeps Tab focus inside the dialog', () => {
    const { dialog } = renderDialog();
    const back = screen.getByRole('button', { name: 'Go back' });
    const confirm = screen.getByRole('button', { name: 'Delete' });

    confirm.focus();
    fireEvent.keyDown(dialog!, { key: 'Tab' });
    expect(back).toHaveFocus();
    fireEvent.keyDown(dialog!, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
  });

  it('ignores input while busy', () => {
    const { onCancel, dialog } = renderDialog({ busy: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    fireEvent.keyDown(dialog!, { key: 'Escape' });
    fireEvent.mouseDown(dialog!.parentElement!);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

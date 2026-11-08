import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PasswordInput from './PasswordInput.tsx';

describe('PasswordInput', () => {
  it('starts hidden and keeps the button out of the field label', () => {
    render(<PasswordInput label="Password" />);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveTextContent('Show');
  });

  it('switches between showing and hiding the password', () => {
    render(<PasswordInput label="Password" defaultValue="secret123" />);
    const input = screen.getByLabelText('Password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('secret123');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveValue('secret123');
  });

  it('does not submit the form it sits in', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput label="Password" />
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps spell checking off, since the shown password is plain text', () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText('Password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('autocapitalize', 'off');
  });

  it('passes the hint and error through to the field', () => {
    render(<PasswordInput label="Password" hint="At least 8 characters" error="Too short" />);

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 8 characters Too short',
    );
    expect(screen.getByLabelText('Password')).toBeInvalid();
  });
});

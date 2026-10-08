import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Alert from './Alert.tsx';
import Button from './Button.tsx';
import Input from './Input.tsx';

describe('Button', () => {
  it('does not submit a form unless asked to', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Plain</Button>
        <Button type="submit">Send</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Plain' }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('maps variants to the existing button classes', () => {
    render(
      <>
        <Button>Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" className="extra">
          Danger
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Primary' })).toHaveAttribute('class', 'btn');
    expect(screen.getByRole('button', { name: 'Ghost' })).toHaveAttribute('class', 'btn btn-ghost');
    expect(screen.getByRole('button', { name: 'Danger' })).toHaveAttribute(
      'class',
      'btn btn-ghost danger extra',
    );
  });
});

describe('Input', () => {
  it('is labelled by its label', () => {
    render(<Input label="Email" type="email" />);

    expect(screen.getByLabelText('Email')).toHaveClass('input');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('links a field error to the input', () => {
    render(<Input label="Email" error="Email is taken" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Email is taken');
    expect(screen.getByText('Email is taken')).toHaveClass('field-error');
  });
});

describe('Alert', () => {
  it('announces its message', () => {
    render(<Alert>Something went wrong</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('alert')).toHaveClass('alert');
  });
});

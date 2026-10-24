import type { ReactNode } from 'react';
import Button from './Button.tsx';

interface AlertProps {
  children: ReactNode;
  /** Shows a "Try again" button, e.g. to reload data that failed to load. */
  onRetry?: () => void;
}

export default function Alert({ children, onRetry }: AlertProps) {
  if (!onRetry) {
    return (
      <p className="alert" role="alert">
        {children}
      </p>
    );
  }
  // The button sits outside the live region so it isn't read out with the message.
  return (
    <div className="alert alert-with-action">
      <p role="alert">{children}</p>
      <Button variant="ghost" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

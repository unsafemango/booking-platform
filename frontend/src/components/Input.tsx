import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
}

export default function Input({ label, error, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const input = (
    <input
      id={inputId}
      className={className ? `input ${className}` : 'input'}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      {...props}
    />
  );

  return (
    <>
      {label ? (
        <label>
          {label}
          {input}
        </label>
      ) : (
        input
      )}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </>
  );
}

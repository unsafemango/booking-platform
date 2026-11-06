import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  /** Helper text under the input, linked with aria-describedby. */
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export default function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  const input = (
    <input
      id={inputId}
      className={className ? `input ${className}` : 'input'}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
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
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </>
  );
}

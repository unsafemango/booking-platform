import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  /** Helper text under the input, linked with aria-describedby. */
  hint?: ReactNode;
  /** Control shown inside the input's right edge, kept out of the label's accessible name. */
  action?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export default function Input({ label, error, hint, action, className, id, ...props }: InputProps) {
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
  const field = label ? (
    <label>
      {label}
      {input}
    </label>
  ) : (
    input
  );

  return (
    <>
      {action ? (
        <div className="input-with-action">
          {field}
          {action}
        </div>
      ) : (
        field
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

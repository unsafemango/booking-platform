import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Returns a ref for a form and a function to call when a submit is rejected. After the next
 * render, focus moves to the first field marked aria-invalid, so keyboard and screen reader
 * users land on the error instead of staying on the submit button.
 */
export function useFocusFirstInvalid<T extends HTMLElement = HTMLFormElement>() {
  const formRef = useRef<T>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  const focusFirstInvalid = useCallback(() => setAttempt((n) => n + 1), []);
  return [formRef, focusFirstInvalid] as const;
}

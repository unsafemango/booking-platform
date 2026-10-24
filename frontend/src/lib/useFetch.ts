import { useEffect, useState } from 'react';

export interface FetchState<T> {
  /** The last successful result; kept while a newer request is in flight or after it fails. */
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

export interface FetchOptions {
  /** Wait this many ms before sending, e.g. to debounce a search box. */
  delay?: number;
}

/**
 * Runs `load` on mount and whenever it changes (wrap it in useCallback), tracking
 * loading, error and data. The previous request is aborted when `load` changes or the
 * component unmounts, so a slow older response can never overwrite a newer one.
 */
export function useFetch<T>(
  load: (signal: AbortSignal) => Promise<T>,
  { delay = 0 }: FetchOptions = {},
): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: undefined,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => (s.loading ? s : { ...s, loading: true }));

    const run = () => {
      load(controller.signal).then(
        (data) => {
          if (controller.signal.aborted) return;
          setState({ data, error: null, loading: false });
        },
        (e: unknown) => {
          if (controller.signal.aborted) return;
          const error = e instanceof Error ? e.message : String(e);
          setState((s) => ({ data: s.data, error, loading: false }));
        },
      );
    };
    const timer = delay > 0 ? setTimeout(run, delay) : undefined;
    if (timer === undefined) run();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, delay]);

  return state;
}

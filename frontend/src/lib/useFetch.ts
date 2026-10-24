import { useEffect, useState } from 'react';
import { ApiError } from './api.ts';

export interface FetchState<T> {
  /** The last successful result for the current request (see `keepPrevious`). */
  data: T | undefined;
  error: string | null;
  /** The HTTP status when the request failed with an ApiError, e.g. 404. */
  errorStatus: number | null;
  loading: boolean;
}

export interface FetchOptions {
  /** Wait this many ms before sending, e.g. to debounce a search box. */
  delay?: number;
  /**
   * Keep the previous data and error while a new request is in flight, instead of
   * clearing them. Useful for search results; detail pages want a clean slate per id.
   */
  keepPrevious?: boolean;
}

/**
 * Runs `load` on mount and whenever it changes (wrap it in useCallback), tracking
 * loading, error and data. The previous request is aborted when `load` changes or the
 * component unmounts, so a slow older response can never overwrite a newer one.
 */
export function useFetch<T>(
  load: (signal: AbortSignal) => Promise<T>,
  { delay = 0, keepPrevious = false }: FetchOptions = {},
): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: undefined,
    error: null,
    errorStatus: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => {
      if (keepPrevious) return s.loading ? s : { ...s, loading: true };
      const fresh = s.loading && s.data === undefined && s.error === null;
      return fresh ? s : { data: undefined, error: null, errorStatus: null, loading: true };
    });

    const run = () => {
      load(controller.signal).then(
        (data) => {
          if (controller.signal.aborted) return;
          setState({ data, error: null, errorStatus: null, loading: false });
        },
        (e: unknown) => {
          if (controller.signal.aborted) return;
          const error = e instanceof Error ? e.message : String(e);
          const errorStatus = e instanceof ApiError ? e.status : null;
          setState((s) => ({ data: s.data, error, errorStatus, loading: false }));
        },
      );
    };
    const timer = delay > 0 ? setTimeout(run, delay) : undefined;
    if (timer === undefined) run();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, delay, keepPrevious]);

  return state;
}

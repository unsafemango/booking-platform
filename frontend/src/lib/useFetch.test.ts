import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api.ts';
import { useFetch } from './useFetch.ts';

/** A promise the test settles by hand, to control when a request finishes. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useFetch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts loading and then exposes the data', async () => {
    const load = vi.fn(() => Promise.resolve(['a', 'b']));
    const { result } = renderHook(() => useFetch(load));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['a', 'b']);
    expect(result.current.error).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports the message and status of an ApiError', async () => {
    const load = () => Promise.reject(new ApiError(404, 'Product not found'));
    const { result } = renderHook(() => useFetch(load));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Product not found');
    expect(result.current.errorStatus).toBe(404);
    expect(result.current.data).toBeUndefined();
  });

  it('reports other errors without a status', async () => {
    const load = () => Promise.reject(new Error('Network down'));
    const { result } = renderHook(() => useFetch(load));

    await waitFor(() => expect(result.current.error).toBe('Network down'));
    expect(result.current.errorStatus).toBeNull();
  });

  it('aborts the previous request and ignores its late response', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const signals: AbortSignal[] = [];
    const loadFirst = (signal: AbortSignal) => {
      signals.push(signal);
      return first.promise;
    };
    const loadSecond = (signal: AbortSignal) => {
      signals.push(signal);
      return second.promise;
    };

    const { result, rerender } = renderHook(({ load }) => useFetch(load), {
      initialProps: { load: loadFirst },
    });
    rerender({ load: loadSecond });
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await act(async () => second.resolve('new'));
    await act(async () => first.resolve('old'));
    expect(result.current.data).toBe('new');
  });

  it('aborts the request on unmount', () => {
    let signal: AbortSignal | undefined;
    const { unmount } = renderHook(() =>
      useFetch((s) => {
        signal = s;
        return new Promise(() => {});
      }),
    );
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('clears the previous data for a new request by default', async () => {
    const next = deferred<string>();
    const { result, rerender } = renderHook(({ load }) => useFetch(load), {
      initialProps: { load: () => Promise.resolve('first') },
    });
    await waitFor(() => expect(result.current.data).toBe('first'));

    rerender({ load: () => next.promise });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('keeps the previous data while loading with keepPrevious', async () => {
    const next = deferred<string>();
    const { result, rerender } = renderHook(({ load }) => useFetch(load, { keepPrevious: true }), {
      initialProps: { load: () => Promise.resolve('first') },
    });
    await waitFor(() => expect(result.current.data).toBe('first'));

    rerender({ load: () => next.promise });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe('first');

    await act(async () => next.resolve('second'));
    expect(result.current.data).toBe('second');
  });

  it('waits for the delay before sending', async () => {
    vi.useFakeTimers();
    const load = vi.fn(() => Promise.resolve('done'));
    renderHook(() => useFetch(load, { delay: 300 }));

    expect(load).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(299));
    expect(load).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not send a delayed request after unmount', () => {
    vi.useFakeTimers();
    const load = vi.fn(() => Promise.resolve('done'));
    const { unmount } = renderHook(() => useFetch(load, { delay: 300 }));
    unmount();
    vi.advanceTimersByTime(300);
    expect(load).not.toHaveBeenCalled();
  });

  it('runs the request again on reload', async () => {
    const load = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockRejectedValueOnce(new Error('Try again'))
      .mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useFetch(load));
    await waitFor(() => expect(result.current.error).toBe('Try again'));

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(result.current.error).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('updates the data in place with setData', async () => {
    const load = vi.fn(() => Promise.resolve([1, 2]));
    const { result } = renderHook(() => useFetch(load));
    await waitFor(() => expect(result.current.data).toEqual([1, 2]));

    act(() => result.current.setData((current) => [...(current ?? []), 3]));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

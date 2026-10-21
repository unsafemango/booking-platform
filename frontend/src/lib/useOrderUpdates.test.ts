import { act, renderHook } from '@testing-library/react';
import { io } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderUpdateEvent } from '../types.ts';
import { tokenStore } from './api.ts';
import { useOrderUpdates } from './useOrderUpdates.ts';

/** A stand-in for the Socket.IO client: tests fire server events by hand. */
const socket = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    on: (event: string, handler: Handler) => handlers.set(event, handler),
    close: vi.fn(),
    emit: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  };
});

vi.mock('socket.io-client', () => ({ io: vi.fn(() => socket) }));

const update: OrderUpdateEvent = {
  type: 'order.status-changed',
  orderId: 'aaaaaaaa-1111-4000-8000-000000000001',
  status: 'CONFIRMED',
  previousStatus: 'PLACED',
  total: 480,
  occurredAt: '2026-10-07T12:05:00Z',
};

function fire(event: string, ...args: unknown[]) {
  act(() => socket.emit(event, ...args));
}

describe('useOrderUpdates', () => {
  beforeEach(() => {
    tokenStore.set('token-123');
  });

  afterEach(() => {
    socket.handlers.clear();
    socket.close.mockClear();
    vi.mocked(io).mockClear();
    localStorage.clear();
  });

  it('opens one socket authenticated with the stored token', () => {
    const { rerender } = renderHook(() => useOrderUpdates(() => {}));
    rerender();
    expect(io).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledWith({ auth: { token: 'token-123' } });
  });

  it('reports the connection state', () => {
    const { result } = renderHook(() => useOrderUpdates(() => {}));
    expect(result.current).toBe(false);
    fire('connect');
    expect(result.current).toBe(true);
    fire('disconnect');
    expect(result.current).toBe(false);
  });

  it('passes order events to the callback', () => {
    const onUpdate = vi.fn();
    renderHook(() => useOrderUpdates(onUpdate));
    fire('order:update', update);
    expect(onUpdate).toHaveBeenCalledWith(update);
  });

  it('calls the latest callback without reopening the socket', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onUpdate }) => useOrderUpdates(onUpdate), {
      initialProps: { onUpdate: first },
    });
    rerender({ onUpdate: second });
    fire('order:update', update);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(update);
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('calls onReconnect only when connecting again, not on the first connect', () => {
    const onReconnect = vi.fn();
    renderHook(() => useOrderUpdates(() => {}, onReconnect));
    fire('connect');
    expect(onReconnect).not.toHaveBeenCalled();
    fire('disconnect');
    fire('connect');
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() => useOrderUpdates(() => {}));
    expect(socket.close).not.toHaveBeenCalled();
    unmount();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });
});

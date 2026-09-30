import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from './api.ts';
import type { OrderUpdateEvent } from '../types.ts';

/**
 * Opens a Socket.IO connection (through the gateway) and calls `onUpdate` for every
 * order event the Real-time Service pushes to this user. Returns the connection state.
 */
export function useOrderUpdates(onUpdate: (event: OrderUpdateEvent) => void): boolean {
  const [connected, setConnected] = useState(false);
  // Keep the latest callback in a ref so the socket is opened once, yet always calls
  // the current handler instead of the one captured on the first render.
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const socket = io({ auth: { token: tokenStore.get() } });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('order:update', (event: OrderUpdateEvent) => onUpdateRef.current(event));
    return () => {
      socket.close();
    };
  }, []);

  return connected;
}

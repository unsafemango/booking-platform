import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from './api.ts';
import type { OrderUpdateEvent } from '../types.ts';

/**
 * Opens a Socket.IO connection (through the gateway) and calls `onUpdate` for every
 * order event the Real-time Service pushes to this user. Returns the connection state.
 *
 * Events sent while the connection was down are lost, so `onReconnect` is called each
 * time the socket connects again after the first time, letting callers refetch.
 */
export function useOrderUpdates(
  onUpdate: (event: OrderUpdateEvent) => void,
  onReconnect?: () => void,
): boolean {
  const [connected, setConnected] = useState(false);
  // Keep the latest callbacks in refs so the socket is opened once, yet always calls
  // the current handlers instead of the ones captured on the first render.
  const onUpdateRef = useRef(onUpdate);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onReconnectRef.current = onReconnect;
  }, [onUpdate, onReconnect]);

  useEffect(() => {
    const socket = io({ auth: { token: tokenStore.get() } });
    let connectedBefore = false;
    socket.on('connect', () => {
      setConnected(true);
      if (connectedBefore) onReconnectRef.current?.();
      connectedBefore = true;
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('order:update', (event: OrderUpdateEvent) => onUpdateRef.current(event));
    return () => {
      socket.close();
    };
  }, []);

  return connected;
}

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from './api.ts';

/**
 * Opens a Socket.IO connection (through the gateway) and calls `onUpdate` for every
 * order event the Real-time Service pushes to this user. Returns the connection state.
 */
export function useOrderUpdates(onUpdate) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({ auth: { token: tokenStore.get() } });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('order:update', (event) => onUpdate(event));
    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return connected;
}

import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

export const userRoom = (userId) => `user:${userId}`;

/**
 * HTTP + Socket.IO server. Clients authenticate during the handshake with the same JWT they use
 * for the REST API: `io({ auth: { token } })`. Each socket joins a room for its user, and order
 * events are emitted only to the owning user's room.
 */
export function createRealtimeServer({ jwtSecret, corsOrigins, log = console }) {
  const app = express();
  app.get('/health', (_req, res) => res.json({ status: 'UP', connections: io.engine.clientsCount }));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: corsOrigins, credentials: true } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const claims = jwt.verify(token, jwtSecret, { algorithms: ['HS256', 'HS384', 'HS512'] });
      socket.data.user = { id: claims.sub, email: claims.email, role: claims.role };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id } = socket.data.user;
    socket.join(userRoom(id));
    log.info(`[ws] user ${id} connected (${io.engine.clientsCount} open)`);
    socket.on('disconnect', () => log.info(`[ws] user ${id} disconnected`));
  });

  function handleEvent(event, routingKey) {
    if (!event?.userId) return;
    io.to(userRoom(event.userId)).emit('order:update', {
      type: routingKey,
      orderId: event.orderId,
      status: event.status,
      previousStatus: event.previousStatus,
      total: event.total,
      occurredAt: event.occurredAt,
    });
  }

  return { app, io, httpServer, handleEvent };
}

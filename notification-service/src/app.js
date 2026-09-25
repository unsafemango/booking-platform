import express from 'express';
import { renderEmail } from './templates.js';

const MAX_PER_USER = 50;

/**
 * Builds the HTTP app plus the event handler. Kept separate from the broker/SMTP wiring
 * in server.js so it can be tested without either.
 */
export function createNotificationApp({ sendMail, log = console }) {
  const history = new Map(); // userId -> newest-first list of sent notifications

  async function handleEvent(event, routingKey) {
    const email = renderEmail(event, routingKey);
    if (!email) return;

    await sendMail({ to: event.userEmail, ...email });

    const list = history.get(event.userId) ?? [];
    list.unshift({
      orderId: event.orderId,
      type: routingKey,
      status: event.status,
      subject: email.subject,
      sentAt: new Date().toISOString(),
    });
    history.set(event.userId, list.slice(0, MAX_PER_USER));
    log.info(`[notify] ${routingKey} ${event.status} -> ${event.userEmail}`);
  }

  const app = express();
  app.get('/health', (_req, res) => res.json({ status: 'UP' }));

  // Reached through the gateway, which sets X-User-Id after validating the JWT.
  app.get('/api/notifications', (req, res) => {
    const userId = req.get('X-User-Id');
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    res.json(history.get(userId) ?? []);
  });

  return { app, handleEvent };
}

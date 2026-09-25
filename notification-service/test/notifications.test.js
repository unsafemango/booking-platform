import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderEmail } from '../src/templates.js';
import { createNotificationApp } from '../src/app.js';

const event = {
  type: 'order.placed',
  orderId: '8f14e45f-ceea-467a-9575-000000000000',
  userId: 'user-1',
  userEmail: 'ada@example.com',
  status: 'PLACED',
  total: 305,
  items: [
    { productName: 'Harbour View Hotel', unitPrice: 100, quantity: 2 },
    { productName: 'Walking Tour', unitPrice: 35, quantity: 3 },
  ],
};

const quiet = { info() {}, warn() {}, error() {} };

test('renders an order placed email', () => {
  const email = renderEmail(event, 'order.placed');
  assert.equal(email.subject, 'Booking received #8F14E45F');
  assert.match(email.text, /2 x Harbour View Hotel @ \$100\.00/);
  assert.match(email.text, /Total: \$305\.00/);
});

test('renders status change emails and skips statuses with no copy', () => {
  const confirmed = renderEmail({ ...event, status: 'CONFIRMED' }, 'order.status-changed');
  assert.match(confirmed.subject, /confirmed/);
  assert.equal(renderEmail({ ...event, status: 'PLACED' }, 'order.status-changed'), null);
  assert.equal(renderEmail(event, 'something.else'), null);
});

test('sends mail and records per-user history served over HTTP', async () => {
  const sent = [];
  const { app, handleEvent } = createNotificationApp({ sendMail: async (m) => sent.push(m), log: quiet });

  await handleEvent(event, 'order.placed');
  await handleEvent({ ...event, status: 'CONFIRMED' }, 'order.status-changed');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, 'ada@example.com');

  const server = app.listen(0);
  try {
    const base = `http://localhost:${server.address().port}`;
    const mine = await fetch(`${base}/api/notifications`, { headers: { 'X-User-Id': 'user-1' } }).then((r) => r.json());
    assert.equal(mine.length, 2);
    assert.equal(mine[0].status, 'CONFIRMED'); // newest first

    const anonymous = await fetch(`${base}/api/notifications`);
    assert.equal(anonymous.status, 401);
  } finally {
    server.close();
  }
});

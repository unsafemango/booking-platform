import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { io as connect } from 'socket.io-client';
import { createRealtimeServer } from '../src/realtime.js';

const secret = 'test-secret-that-is-at-least-32-bytes-long';
const quiet = { info() {}, warn() {}, error() {} };
let server;
let url;

before(async () => {
  server = createRealtimeServer({ jwtSecret: secret, corsOrigins: ['*'], log: quiet });
  await new Promise((resolve) => server.httpServer.listen(0, resolve));
  url = `http://localhost:${server.httpServer.address().port}`;
});

after(() => new Promise((resolve) => server.io.close(resolve)));

const tokenFor = (sub, key = secret) => jwt.sign({ sub, email: `${sub}@example.com`, role: 'CUSTOMER' }, key);

function open(token) {
  const socket = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => {
      socket.close();
      reject(err);
    });
  });
}

test('rejects connections without a valid token', async () => {
  await assert.rejects(open(undefined), /unauthorized/);
  await assert.rejects(open(tokenFor('mallory', 'some-other-secret-at-least-32-bytes!!')), /unauthorized/);
});

test('delivers order updates only to the owning user', async () => {
  const alice = await open(tokenFor('alice'));
  const bob = await open(tokenFor('bob'));
  const bobGot = [];
  bob.on('order:update', (e) => bobGot.push(e));

  const received = new Promise((resolve) => alice.once('order:update', resolve));
  server.handleEvent(
    { orderId: 'o-1', userId: 'alice', status: 'CONFIRMED', previousStatus: 'PLACED', total: 42 },
    'order.status-changed',
  );

  const update = await received;
  assert.equal(update.orderId, 'o-1');
  assert.equal(update.status, 'CONFIRMED');
  assert.equal(update.type, 'order.status-changed');

  await new Promise((r) => setTimeout(r, 50));
  assert.equal(bobGot.length, 0);
  alice.close();
  bob.close();
});

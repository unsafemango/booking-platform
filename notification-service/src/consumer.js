import amqp from 'amqplib';

const RETRY_MS = 5000;

/**
 * Keeps a durable queue bound to the events exchange and hands each message to `onMessage`.
 * Messages that throw are dead-lettered to `<queue>.dlq` instead of being retried forever.
 * Reconnects automatically if the broker goes away.
 */
export function startConsumer({ url, exchange, queue, bindings, onMessage, log = console }) {
  let stopped = false;
  let connection;

  async function connect() {
    try {
      connection = await amqp.connect(url);
      connection.on('error', (err) => log.error('[amqp] connection error:', err.message));
      connection.on('close', () => {
        if (!stopped) {
          log.warn(`[amqp] connection closed, reconnecting in ${RETRY_MS / 1000}s`);
          setTimeout(connect, RETRY_MS);
        }
      });

      const channel = await connection.createChannel();
      const dlx = `${exchange}.dlx`;
      await channel.assertExchange(exchange, 'topic', { durable: true });
      await channel.assertExchange(dlx, 'fanout', { durable: true });
      await channel.assertQueue(`${queue}.dlq`, { durable: true });
      await channel.bindQueue(`${queue}.dlq`, dlx, '');
      await channel.assertQueue(queue, { durable: true, deadLetterExchange: dlx });
      for (const key of bindings) {
        await channel.bindQueue(queue, exchange, key);
      }
      await channel.prefetch(10);

      await channel.consume(queue, async (msg) => {
        if (!msg) return;
        try {
          await onMessage(JSON.parse(msg.content.toString()), msg.fields.routingKey);
          channel.ack(msg);
        } catch (err) {
          log.error(`[amqp] failed to handle ${msg.fields.routingKey}:`, err.message);
          channel.nack(msg, false, false);
        }
      });
      log.info(`[amqp] consuming ${queue} (${bindings.join(', ')})`);
    } catch (err) {
      log.warn(`[amqp] cannot connect (${err.message}), retrying in ${RETRY_MS / 1000}s`);
      if (!stopped) setTimeout(connect, RETRY_MS);
    }
  }

  connect();

  return async function stop() {
    stopped = true;
    await connection?.close().catch(() => {});
  };
}

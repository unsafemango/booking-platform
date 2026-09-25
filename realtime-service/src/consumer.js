import amqp from 'amqplib';

const RETRY_MS = 5000;

/**
 * Each instance gets its own exclusive, auto-deleted queue, so every instance sees every event
 * and forwards it to the sockets connected to it. Missed events while down don't matter here:
 * the browser reloads current state from the Order Service when it reconnects.
 */
export function startConsumer({ url, exchange, bindings, onMessage, log = console }) {
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
      await channel.assertExchange(exchange, 'topic', { durable: true });
      const { queue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });
      for (const key of bindings) {
        await channel.bindQueue(queue, exchange, key);
      }

      await channel.consume(
        queue,
        (msg) => {
          if (!msg) return;
          try {
            onMessage(JSON.parse(msg.content.toString()), msg.fields.routingKey);
          } catch (err) {
            log.error(`[amqp] bad message on ${msg.fields.routingKey}:`, err.message);
          }
        },
        { noAck: true },
      );
      log.info(`[amqp] consuming ${exchange} (${bindings.join(', ')})`);
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

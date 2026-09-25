import { config } from './config.js';
import { createNotificationApp } from './app.js';
import { startConsumer } from './consumer.js';
import { createMailer } from './mailer.js';

const { app, handleEvent } = createNotificationApp({ sendMail: createMailer(config) });

const stopConsumer = startConsumer({
  url: config.amqpUrl,
  exchange: config.exchange,
  queue: config.queue,
  bindings: ['order.*'],
  onMessage: handleEvent,
});

const server = app.listen(config.port, () => {
  console.info(`notification-service listening on :${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await stopConsumer();
    server.close(() => process.exit(0));
  });
}

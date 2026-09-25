import { config } from './config.js';
import { startConsumer } from './consumer.js';
import { createRealtimeServer } from './realtime.js';

const { httpServer, io, handleEvent } = createRealtimeServer(config);

const stopConsumer = startConsumer({
  url: config.amqpUrl,
  exchange: config.exchange,
  bindings: ['order.#'],
  onMessage: handleEvent,
});

httpServer.listen(config.port, () => {
  console.info(`realtime-service listening on :${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await stopConsumer();
    io.close(() => process.exit(0));
  });
}

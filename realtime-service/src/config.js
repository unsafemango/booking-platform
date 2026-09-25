export const config = {
  port: Number(process.env.PORT ?? 4001),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me-please-32-bytes-min',
  amqpUrl: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  exchange: process.env.EVENTS_EXCHANGE ?? 'booking.events',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000').split(','),
};

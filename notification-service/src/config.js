export const config = {
  port: Number(process.env.PORT ?? 4000),
  amqpUrl: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
  exchange: process.env.EVENTS_EXCHANGE ?? 'booking.events',
  queue: process.env.QUEUE ?? 'notification.order-events',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 1025),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  mailFrom: process.env.MAIL_FROM ?? 'Booking Platform <no-reply@booking.local>',
};

const money = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));

const shortId = (id) => String(id).slice(0, 8).toUpperCase();

function itemLines(items = []) {
  return items.map((i) => `  - ${i.quantity} x ${i.productName} @ ${money(i.unitPrice)}`).join('\n');
}

const STATUS_COPY = {
  CONFIRMED: {
    subject: 'Your booking is confirmed',
    body: 'Good news: the provider has confirmed your booking.',
  },
  COMPLETED: {
    subject: 'Thanks for booking with us',
    body: 'Your booking is complete. We hope you enjoyed it!',
  },
  CANCELLED: {
    subject: 'Your booking was cancelled',
    body: 'Your booking has been cancelled and any held availability has been released.',
  },
};

/** Turns an order event into an email, or returns null if the event doesn't warrant one. */
export function renderEmail(event, routingKey = event.type) {
  const ref = `#${shortId(event.orderId)}`;

  if (routingKey === 'order.placed') {
    return {
      subject: `Booking received ${ref}`,
      text: [
        'Thanks for your booking! We have reserved:',
        '',
        itemLines(event.items),
        '',
        `Total: ${money(event.total)}`,
        '',
        "We'll email you again once it's confirmed.",
      ].join('\n'),
    };
  }

  if (routingKey === 'order.status-changed') {
    const copy = STATUS_COPY[event.status];
    if (!copy) return null;
    return {
      subject: `${copy.subject} ${ref}`,
      text: [copy.body, '', itemLines(event.items), '', `Total: ${money(event.total)}`].join('\n'),
    };
  }

  return null;
}

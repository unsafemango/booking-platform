package com.booking.order.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends order events to RabbitMQ only after the database transaction commits, so consumers
 * never hear about an order that was rolled back.
 */
@Component
public class OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);

    private final RabbitTemplate rabbit;
    private final String exchange;

    public OrderEventPublisher(RabbitTemplate rabbit, @Value("${messaging.exchange}") String exchange) {
        this.rabbit = rabbit;
        this.exchange = exchange;
    }

    @TransactionalEventListener
    public void on(OrderEvent event) {
        try {
            rabbit.convertAndSend(exchange, event.type(), event);
            log.info("Published {} for order {}", event.type(), event.orderId());
        } catch (AmqpException e) {
            // The order is already saved. A transactional outbox would make this delivery guaranteed.
            log.error("Failed to publish {} for order {}", event.type(), event.orderId(), e);
        }
    }
}

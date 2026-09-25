package com.booking.order.service;

import java.time.Duration;
import java.time.Instant;

import com.booking.order.domain.OrderStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Stands in for a real provider so you can watch orders move PLACED → CONFIRMED → COMPLETED
 * live in the browser. Turn it off with {@code orders.simulator.enabled=false}.
 */
@Component
@ConditionalOnProperty(name = "orders.simulator.enabled", havingValue = "true")
public class FulfillmentSimulator {

    @ConfigurationProperties(prefix = "orders.simulator")
    public record Settings(boolean enabled, Duration confirmAfter, Duration completeAfter) {
    }

    private final OrderService orders;
    private final Settings settings;

    public FulfillmentSimulator(OrderService orders, Settings settings) {
        this.orders = orders;
        this.settings = settings;
    }

    @Scheduled(fixedDelayString = "${orders.simulator.poll-interval-ms:2000}")
    public void tick() {
        Instant now = Instant.now();
        orders.advance(OrderStatus.PLACED, OrderStatus.CONFIRMED, now.minus(settings.confirmAfter()));
        orders.advance(OrderStatus.CONFIRMED, OrderStatus.COMPLETED, now.minus(settings.completeAfter()));
    }
}

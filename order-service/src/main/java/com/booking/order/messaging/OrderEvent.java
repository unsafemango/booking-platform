package com.booking.order.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.booking.order.domain.Order;
import com.booking.order.domain.OrderStatus;

/**
 * Published to the {@code booking.events} topic exchange. Consumers (notification, realtime)
 * get everything they need in the payload so they never have to call back into this service.
 */
public record OrderEvent(
        String type,
        UUID orderId,
        UUID userId,
        String userEmail,
        OrderStatus status,
        OrderStatus previousStatus,
        BigDecimal total,
        List<Item> items,
        Instant occurredAt) {

    public static final String PLACED = "order.placed";
    public static final String STATUS_CHANGED = "order.status-changed";

    public record Item(UUID productId, String productName, BigDecimal unitPrice, int quantity) {
    }

    public static OrderEvent placed(Order order) {
        return of(PLACED, order, null);
    }

    public static OrderEvent statusChanged(Order order, OrderStatus previous) {
        return of(STATUS_CHANGED, order, previous);
    }

    private static OrderEvent of(String type, Order order, OrderStatus previous) {
        List<Item> items = order.getItems().stream()
                .map(i -> new Item(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity()))
                .toList();
        return new OrderEvent(type, order.getId(), order.getUserId(), order.getUserEmail(),
                order.getStatus(), previous, order.getTotal(), items, Instant.now());
    }
}

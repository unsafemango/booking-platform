package com.booking.order.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.booking.order.domain.Order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record OrderLine(@NotNull UUID productId, @Min(1) @Max(50) int quantity) {
    }

    public record PlaceOrderRequest(@NotEmpty @Valid List<OrderLine> items) {
    }

    public record ItemResponse(UUID productId, String productName, BigDecimal unitPrice, int quantity) {
    }

    public record OrderResponse(UUID id, String status, BigDecimal total, List<ItemResponse> items,
                                Instant createdAt, Instant updatedAt) {
        public static OrderResponse from(Order o) {
            List<ItemResponse> items = o.getItems().stream()
                    .map(i -> new ItemResponse(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity()))
                    .toList();
            return new OrderResponse(o.getId(), o.getStatus().name(), o.getTotal(), items, o.getCreatedAt(), o.getUpdatedAt());
        }
    }
}

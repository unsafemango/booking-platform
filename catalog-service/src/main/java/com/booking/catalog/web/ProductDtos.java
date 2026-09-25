package com.booking.catalog.web;

import java.math.BigDecimal;
import java.util.UUID;

import com.booking.catalog.domain.Product;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ProductDtos {

    private ProductDtos() {
    }

    public record ProductRequest(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 2000) String description,
            @NotBlank @Size(max = 50) String category,
            @NotNull @DecimalMin("0.00") BigDecimal price,
            @Min(0) int stock,
            String imageUrl) {
    }

    public record ProductResponse(UUID id, String name, String description, String category,
                                  BigDecimal price, int stock, String imageUrl) {
        public static ProductResponse from(Product p) {
            return new ProductResponse(p.getId(), p.getName(), p.getDescription(), p.getCategory(),
                    p.getPrice(), p.getStock(), p.getImageUrl());
        }
    }

    public record StockRequest(@Min(1) int quantity) {
    }

    /** What the Order Service needs to snapshot onto an order line. */
    public record ReservationResponse(UUID productId, String name, BigDecimal unitPrice, int quantity, int remainingStock) {
    }
}

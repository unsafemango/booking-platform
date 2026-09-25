package com.booking.order.catalog;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Synchronous REST calls to the Catalog Service's internal inventory API. */
@Component
public class CatalogClient {

    public record Reservation(UUID productId, String name, BigDecimal unitPrice, int quantity, int remainingStock) {
    }

    private final RestClient http;

    public CatalogClient(RestClient.Builder builder, ObjectMapper json,
                         @Value("${catalog.base-url}") String baseUrl) {
        this.http = builder
                .baseUrl(baseUrl)
                .defaultStatusHandler(HttpStatusCode::is4xxClientError, (request, response) -> {
                    String message = "Catalog request failed";
                    try {
                        JsonNode body = json.readTree(response.getBody());
                        if (body != null && body.hasNonNull("error")) {
                            message = body.get("error").asText();
                        }
                    } catch (Exception ignored) {
                        // fall back to the generic message
                    }
                    throw new CatalogException(response.getStatusCode(), message);
                })
                .build();
    }

    public Reservation reserve(UUID productId, int quantity) {
        return http.post()
                .uri("/internal/products/{id}/reserve", productId)
                .body(Map.of("quantity", quantity))
                .retrieve()
                .body(Reservation.class);
    }

    public void release(UUID productId, int quantity) {
        http.post()
                .uri("/internal/products/{id}/release", productId)
                .body(Map.of("quantity", quantity))
                .retrieve()
                .toBodilessEntity();
    }
}

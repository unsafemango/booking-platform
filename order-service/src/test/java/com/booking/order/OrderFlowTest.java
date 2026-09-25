package com.booking.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.booking.order.catalog.CatalogClient;
import com.booking.order.catalog.CatalogClient.Reservation;
import com.booking.order.catalog.CatalogException;
import com.booking.order.domain.OrderStatus;
import com.booking.order.messaging.OrderEvent;
import com.booking.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderFlowTest {

    static final UUID HOTEL = UUID.randomUUID();
    static final UUID TOUR = UUID.randomUUID();

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Autowired
    OrderService orderService;

    @MockitoBean
    CatalogClient catalog;

    @MockitoBean
    RabbitTemplate rabbit;

    @Test
    void placesOrderSnapshotsPricesAndPublishesEvent() throws Exception {
        UUID user = UUID.randomUUID();
        when(catalog.reserve(HOTEL, 2)).thenReturn(new Reservation(HOTEL, "Hotel", new BigDecimal("100.00"), 2, 5));
        when(catalog.reserve(TOUR, 3)).thenReturn(new Reservation(TOUR, "Tour", new BigDecimal("35.00"), 3, 10));

        String response = mvc.perform(post("/api/orders")
                        .header("X-User-Id", user).header("X-User-Email", "ada@example.com")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"items":[{"productId":"%s","quantity":1},{"productId":"%s","quantity":3},
                                          {"productId":"%s","quantity":1}]}""".formatted(HOTEL, TOUR, HOTEL)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PLACED"))
                .andExpect(jsonPath("$.total").value(305.00))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andReturn().getResponse().getContentAsString();
        String orderId = json.readTree(response).get("id").asText();

        ArgumentCaptor<OrderEvent> event = ArgumentCaptor.forClass(OrderEvent.class);
        verify(rabbit).convertAndSend(eq("booking.events"), eq("order.placed"), event.capture());
        assertThat(event.getValue().userEmail()).isEqualTo("ada@example.com");
        assertThat(event.getValue().orderId().toString()).isEqualTo(orderId);

        mvc.perform(get("/api/orders").header("X-User-Id", user))
                .andExpect(jsonPath("$.length()").value(1));

        // Other users can't see it
        mvc.perform(get("/api/orders/{id}", orderId).header("X-User-Id", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void releasesEarlierReservationsWhenALaterOneFails() throws Exception {
        when(catalog.reserve(HOTEL, 1)).thenReturn(new Reservation(HOTEL, "Hotel", new BigDecimal("100.00"), 1, 5));
        when(catalog.reserve(TOUR, 1)).thenThrow(new CatalogException(HttpStatus.CONFLICT, "Not enough availability for Tour"));

        mvc.perform(post("/api/orders")
                        .header("X-User-Id", UUID.randomUUID()).header("X-User-Email", "a@b.c")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"items":[{"productId":"%s","quantity":1},{"productId":"%s","quantity":1}]}"""
                                .formatted(HOTEL, TOUR)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Not enough availability for Tour"));

        verify(catalog).release(HOTEL, 1);
        verify(rabbit, never()).convertAndSend(any(String.class), eq("order.placed"), any(Object.class));
    }

    @Test
    void cancelReleasesStockAndLifecycleAdvances() throws Exception {
        UUID user = UUID.randomUUID();
        when(catalog.reserve(HOTEL, 1)).thenReturn(new Reservation(HOTEL, "Hotel", new BigDecimal("100.00"), 1, 5));

        String first = placeOne(user);
        mvc.perform(post("/api/orders/{id}/cancel", first).header("X-User-Id", user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        verify(catalog).release(HOTEL, 1);
        mvc.perform(post("/api/orders/{id}/cancel", first).header("X-User-Id", user))
                .andExpect(status().isConflict());

        String second = placeOne(user);
        Instant future = Instant.now().plusSeconds(1);
        orderService.advance(OrderStatus.PLACED, OrderStatus.CONFIRMED, future);
        orderService.advance(OrderStatus.CONFIRMED, OrderStatus.COMPLETED, future);
        mvc.perform(get("/api/orders/{id}", second).header("X-User-Id", user))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
        mvc.perform(get("/api/orders/{id}", first).header("X-User-Id", user))
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void rejectsEmptyOrdersAndMissingIdentity() throws Exception {
        mvc.perform(post("/api/orders").header("X-User-Id", UUID.randomUUID()).header("X-User-Email", "a@b.c")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"items\":[]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/orders"))
                .andExpect(status().isUnauthorized());
    }

    private String placeOne(UUID user) throws Exception {
        String body = mvc.perform(post("/api/orders")
                        .header("X-User-Id", user).header("X-User-Email", "a@b.c")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"productId\":\"%s\",\"quantity\":1}]}".formatted(HOTEL)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }
}

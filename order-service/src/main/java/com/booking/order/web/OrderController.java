package com.booking.order.web;

import java.util.List;
import java.util.UUID;

import com.booking.order.service.OrderService;
import com.booking.order.web.OrderDtos.OrderResponse;
import com.booking.order.web.OrderDtos.PlaceOrderRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Identity comes from the X-User-* headers the gateway adds after validating the JWT. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orders;

    public OrderController(OrderService orders) {
        this.orders = orders;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse place(@RequestHeader("X-User-Id") UUID userId,
                               @RequestHeader("X-User-Email") String email,
                               @Valid @RequestBody PlaceOrderRequest request) {
        return orders.placeOrder(userId, email, request.items());
    }

    @GetMapping
    public List<OrderResponse> mine(@RequestHeader("X-User-Id") UUID userId) {
        return orders.findForUser(userId);
    }

    @GetMapping("/{id}")
    public OrderResponse get(@RequestHeader("X-User-Id") UUID userId, @PathVariable UUID id) {
        return orders.findForUser(userId, id);
    }

    @PostMapping("/{id}/cancel")
    public OrderResponse cancel(@RequestHeader("X-User-Id") UUID userId, @PathVariable UUID id) {
        return orders.cancel(userId, id);
    }
}

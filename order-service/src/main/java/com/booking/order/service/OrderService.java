package com.booking.order.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.booking.order.catalog.CatalogClient;
import com.booking.order.catalog.CatalogClient.Reservation;
import com.booking.order.domain.Order;
import com.booking.order.domain.OrderRepository;
import com.booking.order.domain.OrderStatus;
import com.booking.order.messaging.OrderEvent;
import com.booking.order.web.OrderDtos.OrderLine;
import com.booking.order.web.OrderDtos.OrderResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orders;
    private final CatalogClient catalog;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;

    public OrderService(OrderRepository orders, CatalogClient catalog,
                        ApplicationEventPublisher events, TransactionTemplate tx) {
        this.orders = orders;
        this.catalog = catalog;
        this.events = events;
        this.tx = tx;
    }

    /**
     * Reserves stock for each line in the Catalog Service, then saves the order. If anything fails
     * part way through, the reservations already made are released again (a simple saga).
     * The remote calls deliberately happen outside the database transaction.
     */
    public OrderResponse placeOrder(UUID userId, String userEmail, List<OrderLine> lines) {
        Map<UUID, Integer> quantities = new LinkedHashMap<>();
        lines.forEach(l -> quantities.merge(l.productId(), l.quantity(), Integer::sum));

        List<Reservation> reserved = new ArrayList<>();
        try {
            quantities.forEach((productId, qty) -> reserved.add(catalog.reserve(productId, qty)));
            return tx.execute(status -> {
                Order order = new Order(userId, userEmail);
                reserved.forEach(r -> order.addItem(r.productId(), r.name(), r.unitPrice(), r.quantity()));
                orders.save(order);
                events.publishEvent(OrderEvent.placed(order));
                return OrderResponse.from(order);
            });
        } catch (RuntimeException e) {
            releaseAll(reserved);
            throw e;
        }
    }

    public List<OrderResponse> findForUser(UUID userId) {
        return tx.execute(status -> orders.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(OrderResponse::from).toList());
    }

    public OrderResponse findForUser(UUID userId, UUID orderId) {
        return tx.execute(status -> OrderResponse.from(loadOwned(userId, orderId)));
    }

    public OrderResponse cancel(UUID userId, UUID orderId) {
        Order cancelled = tx.execute(status -> {
            Order order = loadOwned(userId, orderId);
            if (!order.getStatus().isCancellable()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Order is " + order.getStatus() + " and can no longer be cancelled");
            }
            OrderStatus previous = order.getStatus();
            order.transitionTo(OrderStatus.CANCELLED);
            order.getItems().size(); // load items before the session closes
            events.publishEvent(OrderEvent.statusChanged(order, previous));
            return order;
        });
        releaseAll(cancelled.getItems().stream()
                .map(i -> new Reservation(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity(), 0))
                .toList());
        return OrderResponse.from(cancelled);
    }

    /** Moves every order stuck in {@code from} since before {@code cutoff} to {@code to}. */
    public int advance(OrderStatus from, OrderStatus to, Instant cutoff) {
        List<UUID> ids = orders.findByStatusAndUpdatedAtBefore(from, cutoff).stream().map(Order::getId).toList();
        int moved = 0;
        for (UUID id : ids) {
            Boolean changed = tx.execute(status -> orders.findById(id)
                    .filter(o -> o.getStatus() == from)
                    .map(o -> {
                        o.transitionTo(to);
                        events.publishEvent(OrderEvent.statusChanged(o, from));
                        return true;
                    })
                    .orElse(false));
            if (Boolean.TRUE.equals(changed)) {
                moved++;
            }
        }
        return moved;
    }

    private Order loadOwned(UUID userId, UUID orderId) {
        Order order = orders.findById(orderId)
                .filter(o -> o.getUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        order.getItems().size();
        return order;
    }

    private void releaseAll(List<Reservation> reservations) {
        for (Reservation r : reservations) {
            try {
                catalog.release(r.productId(), r.quantity());
            } catch (RuntimeException e) {
                log.error("Could not release {} x {}; stock needs manual correction", r.quantity(), r.productId(), e);
            }
        }
    }
}

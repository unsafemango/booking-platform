package com.booking.catalog.web;

import java.util.UUID;

import com.booking.catalog.domain.Product;
import com.booking.catalog.domain.ProductRepository;
import com.booking.catalog.web.ProductDtos.ReservationResponse;
import com.booking.catalog.web.ProductDtos.StockRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Service-to-service endpoints used by the Order Service. The gateway has no route for
 * {@code /internal/**}, so these are only reachable from inside the private network.
 */
@RestController
@RequestMapping("/internal/products/{id}")
public class InventoryController {

    private final ProductRepository products;

    public InventoryController(ProductRepository products) {
        this.products = products;
    }

    @PostMapping("/reserve")
    @Transactional
    public ReservationResponse reserve(@PathVariable UUID id, @Valid @RequestBody StockRequest request) {
        Product product = products.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (products.reserve(id, request.quantity()) == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Not enough availability for " + product.getName());
        }
        Product updated = products.findById(id).orElseThrow();
        return new ReservationResponse(id, updated.getName(), updated.getPrice(), request.quantity(), updated.getStock());
    }

    @PostMapping("/release")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void release(@PathVariable UUID id, @Valid @RequestBody StockRequest request) {
        if (products.release(id, request.quantity()) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
        }
    }
}

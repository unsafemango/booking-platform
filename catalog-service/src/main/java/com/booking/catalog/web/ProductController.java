package com.booking.catalog.web;

import java.util.List;
import java.util.UUID;

import com.booking.catalog.domain.Product;
import com.booking.catalog.domain.ProductRepository;
import com.booking.catalog.web.ProductDtos.ProductRequest;
import com.booking.catalog.web.ProductDtos.ProductResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository products;

    public ProductController(ProductRepository products) {
        this.products = products;
    }

    @GetMapping
    public List<ProductResponse> list(@RequestParam(required = false) String q,
                                      @RequestParam(required = false) String category) {
        return products.search(StringUtils.hasText(q) ? q.trim() : null,
                        StringUtils.hasText(category) ? category : null)
                .stream().map(ProductResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable UUID id) {
        return ProductResponse.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ProductResponse create(@RequestHeader(name = "X-User-Role", required = false) String role,
                                  @Valid @RequestBody ProductRequest r) {
        requireAdmin(role);
        Product product = new Product(r.name(), r.description(), r.category(), r.price(), r.stock(), r.imageUrl());
        return ProductResponse.from(products.save(product));
    }

    @PutMapping("/{id}")
    @Transactional
    public ProductResponse update(@RequestHeader(name = "X-User-Role", required = false) String role,
                                  @PathVariable UUID id, @Valid @RequestBody ProductRequest r) {
        requireAdmin(role);
        Product product = find(id);
        product.update(r.name(), r.description(), r.category(), r.price(), r.stock(), r.imageUrl());
        return ProductResponse.from(product);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@RequestHeader(name = "X-User-Role", required = false) String role, @PathVariable UUID id) {
        requireAdmin(role);
        products.delete(find(id));
    }

    private Product find(UUID id) {
        return products.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private static void requireAdmin(String role) {
        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
        }
    }
}

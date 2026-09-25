package com.booking.order.catalog;

import org.springframework.http.HttpStatusCode;

/** A 4xx from the Catalog Service that should be passed on to the caller (unknown product, sold out). */
public class CatalogException extends RuntimeException {

    private final HttpStatusCode status;

    public CatalogException(HttpStatusCode status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatusCode getStatus() {
        return status;
    }
}

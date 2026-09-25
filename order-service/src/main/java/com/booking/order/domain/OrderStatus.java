package com.booking.order.domain;

public enum OrderStatus {
    /** Inventory reserved, waiting for the provider to confirm. */
    PLACED,
    CONFIRMED,
    COMPLETED,
    CANCELLED;

    public boolean isCancellable() {
        return this == PLACED || this == CONFIRMED;
    }
}

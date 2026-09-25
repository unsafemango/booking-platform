CREATE TABLE orders (
    id         UUID PRIMARY KEY,
    user_id    UUID           NOT NULL,
    user_email VARCHAR(255)   NOT NULL,
    status     VARCHAR(20)    NOT NULL,
    total      NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version    BIGINT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_orders_user ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status, updated_at);

CREATE TABLE order_items (
    id           UUID PRIMARY KEY,
    order_id     UUID           NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id   UUID           NOT NULL,
    product_name VARCHAR(200)   NOT NULL,
    unit_price   NUMERIC(12, 2) NOT NULL,
    quantity     INTEGER        NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

CREATE TABLE products (
    id          UUID PRIMARY KEY,
    name        VARCHAR(200)   NOT NULL,
    description VARCHAR(2000),
    category    VARCHAR(50)    NOT NULL,
    price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock       INTEGER        NOT NULL CHECK (stock >= 0),
    image_url   VARCHAR(500),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_products_category ON products (category);

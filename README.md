# Booking Platform

A microservices booking app. Each service owns one job and its own database. Services talk over REST (synchronous) or RabbitMQ (asynchronous events), and a single gateway is the only address the browser knows.

```
                     ┌──────────────┐
 Browser (React) ──▶ │ API Gateway  │  :8080  routes + validates JWT
                     └──────┬───────┘
      ┌──────────────┬──────┼───────────────┬────────────────────┐
      ▼              ▼      ▼               ▼                    ▼
 User Service   Catalog    Order Service   Notification        Real-time
 :8081          :8082      :8083           Service :4000       Service :4001
 Postgres       Postgres   Postgres        (Node, Express)     (Node, Socket.IO)
                   ▲          │                  ▲                    ▲
                   └── REST ──┘                  │                    │
               reserve/release stock             │                    │
                              │   order.placed   │                    │
                              └──▶ RabbitMQ ─────┴────────────────────┘
                                   topic exchange "booking.events"
```

| Service                | Stack                               | Owns                                    | Port                   |
| ---------------------- | ----------------------------------- | --------------------------------------- | ---------------------- |
| `gateway`              | Spring Cloud Gateway                | Routing, JWT check, CORS                | 8080                   |
| `user-service`         | Spring Boot + PostgreSQL            | Sign up, login, issuing JWTs            | 8081                   |
| `catalog-service`      | Spring Boot + PostgreSQL            | Bookable items, prices, availability    | 8082                   |
| `order-service`        | Spring Boot + PostgreSQL + RabbitMQ | Orders, publishes order events          | 8083                   |
| `notification-service` | Node + Express                      | Emails for order events                 | 4000                   |
| `realtime-service`     | Node + Socket.IO                    | Live order status pushed to the browser | 4001                   |
| `frontend`             | React + Vite                        | UI; talks only to the gateway           | 5173 dev / 3000 docker |

## Run everything

Requires Docker.

```bash
cp .env.example .env
docker compose up --build
```

- App: http://localhost:3000
- Caught emails (Mailpit): http://localhost:8025
- RabbitMQ management: http://localhost:15672 (guest / guest)

Sign up, add a couple of items to the cart and book. On **My bookings** the status moves `PLACED → CONFIRMED` (after ~5s) `→ COMPLETED` (after ~20s) live, with no refresh. Each step also sends an email you can see in Mailpit. The Order Service's fulfilment simulator drives these changes; turn it off with `SIMULATE_FULFILLMENT=false`.

## Develop locally

Run the infrastructure in Docker and the services on your machine. The host ports and default credentials already match each service's `application.yml`.

```bash
docker compose up -d user-db catalog-db order-db rabbitmq mailpit
```

Then, each in its own terminal (Java 21+, Node 20+):

```bash
cd user-service && mvn spring-boot:run
cd catalog-service && mvn spring-boot:run
cd order-service && mvn spring-boot:run
cd gateway && mvn spring-boot:run
cd notification-service && npm install && SMTP_HOST=localhost npm run dev
cd realtime-service && npm install && npm run dev
cd frontend && npm install && npm run dev      # http://localhost:5173
```

Vite proxies `/api` and `/socket.io` to the gateway, so the browser only sees one origin.

## Tests

```bash
cd user-service && mvn test        # register/login/profile against H2
cd catalog-service && mvn test     # search, admin-only writes, no overselling
cd order-service && mvn test       # saga compensation, events, cancel, lifecycle
cd gateway && mvn test             # JWT filter + route table
cd notification-service && npm test
cd realtime-service && npm test    # real Socket.IO clients, per-user delivery
```

## How the pieces fit

**Authentication.** The User Service signs an HS256 JWT (`sub` = user id, plus `email`, `role`). The gateway verifies it on every non-public route, strips any `X-User-*` headers the client sent, and forwards `X-User-Id`, `X-User-Email` and `X-User-Role` to the downstream services. Downstream services trust those headers and never parse tokens. The one exception is the Real-time Service: Socket.IO clients send the token in the handshake (`io({ auth: { token } })`), so it checks the JWT itself with the same `JWT_SECRET`.

Public routes: `/api/auth/**`, `GET /api/products/**`, `/socket.io/**` (authenticated in the handshake).

**Placing an order (REST + saga).** `POST /api/orders` makes the Order Service call `POST /internal/products/{id}/reserve` on the Catalog Service for each line. Each reserve is a single conditional `UPDATE … WHERE stock >= qty`, so concurrent orders can't oversell. If any line fails, the reservations already made are released again. The price and name are copied onto the order so later catalog edits don't rewrite history. `/internal/**` has no gateway route, so the browser can't reach it.

**Events (async).** After the order transaction commits, the Order Service publishes to the `booking.events` topic exchange:

| Routing key            | When                              |
| ---------------------- | --------------------------------- |
| `order.placed`         | New order saved                   |
| `order.status-changed` | Confirmed, completed or cancelled |

The payload carries everything consumers need (user email, items, totals), so they never call back into the Order Service.

- **Notification Service** has a durable queue `notification.order-events`. Messages that fail go to `notification.order-events.dlq` instead of retrying forever.
- **Real-time Service** gives each instance its own exclusive queue, so it can scale horizontally. It emits `order:update` only to the `user:<id>` room of the order's owner.

## API

| Method          | Path                         | Auth  |                                                        |
| --------------- | ---------------------------- | ----- | ------------------------------------------------------ |
| POST            | `/api/auth/register`         | –     | `{name, email, password}` → `{token, expiresIn, user}` |
| POST            | `/api/auth/login`            | –     | `{email, password}` → `{token, expiresIn, user}`       |
| GET             | `/api/users/me`              | user  | Current profile                                        |
| GET             | `/api/products?q=&category=` | –     | Search the catalog                                     |
| GET             | `/api/products/{id}`         | –     |                                                        |
| POST/PUT/DELETE | `/api/products[/{id}]`       | admin | Manage the catalog                                     |
| POST            | `/api/orders`                | user  | `{items: [{productId, quantity}]}`                     |
| GET             | `/api/orders`                | user  | My orders, newest first                                |
| GET             | `/api/orders/{id}`           | user  |                                                        |
| POST            | `/api/orders/{id}/cancel`    | user  | Releases the held availability                         |
| GET             | `/api/notifications`         | user  | Emails sent to me (in memory)                          |

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` to seed an admin account.

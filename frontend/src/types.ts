/** Shapes of the gateway API. Ids are UUIDs, timestamps are ISO-8601 strings, money is a JSON number. */

export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** POST /api/auth/login and /api/auth/register. */
export interface AuthResponse {
  token: string;
  /** Token lifetime in seconds. */
  expiresIn: number;
  user: User;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
}

/** Body of POST /api/products and PUT /api/products/{id} (admin only). */
export type ProductInput = Omit<Product, 'id'>;

export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /api/orders. */
export interface PlaceOrderRequest {
  items: { productId: string; quantity: number }[];
}

/** Routing key of the order event that triggered a notification or live update. */
export type OrderEventType = 'order.placed' | 'order.status-changed';

/** GET /api/notifications. */
export interface Notification {
  orderId: string;
  type: OrderEventType;
  status: OrderStatus;
  subject: string;
  sentAt: string;
}

/** Socket.IO "order:update" payload. */
export interface OrderUpdateEvent {
  type: OrderEventType;
  orderId: string;
  status: OrderStatus;
  /** null when the order was just placed. */
  previousStatus: OrderStatus | null;
  total: number;
  occurredAt: string;
}

/** Error body returned by every service. */
export interface ApiErrorBody {
  error: string;
  /** Validation messages keyed by field name. */
  fields?: Record<string, string>;
}

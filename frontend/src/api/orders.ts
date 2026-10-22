import { api } from '../lib/api.ts';
import type { Order, PlaceOrderRequest } from '../types.ts';

const orderPath = (id: string): string => `/api/orders/${encodeURIComponent(id)}`;

export const listOrders = (signal?: AbortSignal): Promise<Order[]> =>
  api<Order[]>('/api/orders', { signal });

export const getOrder = (id: string, signal?: AbortSignal): Promise<Order> =>
  api<Order>(orderPath(id), { signal });

export const placeOrder = (request: PlaceOrderRequest): Promise<Order> =>
  api<Order>('/api/orders', { method: 'POST', body: request });

export const cancelOrder = (id: string): Promise<Order> =>
  api<Order>(`${orderPath(id)}/cancel`, { method: 'POST' });

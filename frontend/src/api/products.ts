import { api } from '../lib/api.ts';
import type { Product, ProductInput } from '../types.ts';

export interface ProductFilters {
  q?: string;
  category?: string;
}

const productPath = (id: string): string => `/api/products/${encodeURIComponent(id)}`;

/** Empty filters are left out of the query string. */
export function listProducts({ q, category }: ProductFilters = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  const query = params.toString();
  return api<Product[]>(query ? `/api/products?${query}` : '/api/products');
}

export const getProduct = (id: string): Promise<Product> => api<Product>(productPath(id));

/** Admin only. */
export const createProduct = (input: ProductInput): Promise<Product> =>
  api<Product>('/api/products', { method: 'POST', body: input });

/** Admin only. */
export const updateProduct = (id: string, input: ProductInput): Promise<Product> =>
  api<Product>(productPath(id), { method: 'PUT', body: input });

/** Admin only. */
export const deleteProduct = (id: string): Promise<null> =>
  api<null>(productPath(id), { method: 'DELETE' });

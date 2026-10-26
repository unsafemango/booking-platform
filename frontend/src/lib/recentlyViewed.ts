import type { Product } from '../types.ts';

const RECENT_KEY = 'booking.recentlyViewed';

/** How many products are remembered, most recent first. */
export const RECENT_LIMIT = 6;

/** The few fields kept per product, enough to link back to it. */
export type RecentProduct = Pick<Product, 'id' | 'name' | 'category' | 'price'>;

function isRecentProduct(value: unknown): value is RecentProduct {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.category === 'string' &&
    typeof v.price === 'number'
  );
}

/** Products viewed in this browser, most recent first; empty when storage is unavailable. */
export function loadRecentlyViewed(): RecentProduct[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed.filter(isRecentProduct) : [];
  } catch {
    return [];
  }
}

/** Moves the product to the front of the list, saves it and returns the new list. */
export function recordView(product: Product): RecentProduct[] {
  const { id, name, category, price } = product;
  const next = [
    { id, name, category, price },
    ...loadRecentlyViewed().filter((p) => p.id !== id),
  ].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable; the list just won't survive a reload
  }
  return next;
}

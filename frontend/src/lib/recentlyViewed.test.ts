import { describe, expect, it } from 'vitest';
import type { Product } from '../types.ts';
import { RECENT_LIMIT, loadRecentlyViewed, recordView } from './recentlyViewed.ts';

const RECENT_KEY = 'booking.recentlyViewed';

function product(id: string): Product {
  return {
    id,
    name: `Listing ${id}`,
    description: 'Long description that is not stored',
    category: 'Stays',
    price: 100,
    stock: 3,
    imageUrl: '/img.png',
  };
}

describe('recently viewed products', () => {
  it('is empty when nothing is stored or the stored value is invalid', () => {
    expect(loadRecentlyViewed()).toEqual([]);
    localStorage.setItem(RECENT_KEY, '{not json');
    expect(loadRecentlyViewed()).toEqual([]);
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([{ id: 1 }, { id: 'a', name: 'A', category: 'X', price: 5 }]),
    );
    expect(loadRecentlyViewed()).toEqual([{ id: 'a', name: 'A', category: 'X', price: 5 }]);
  });

  it('keeps only the summary fields, most recent first, without duplicates', () => {
    recordView(product('a'));
    recordView(product('b'));
    const list = recordView(product('a'));

    expect(list.map((p) => p.id)).toEqual(['a', 'b']);
    expect(list[0]).toEqual({ id: 'a', name: 'Listing a', category: 'Stays', price: 100 });
    expect(loadRecentlyViewed()).toEqual(list);
  });

  it(`remembers at most ${RECENT_LIMIT} products`, () => {
    for (let i = 0; i < RECENT_LIMIT + 2; i++) recordView(product(String(i)));

    const ids = loadRecentlyViewed().map((p) => p.id);
    expect(ids).toHaveLength(RECENT_LIMIT);
    expect(ids[0]).toBe(String(RECENT_LIMIT + 1));
  });
});

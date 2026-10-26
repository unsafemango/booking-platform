import { describe, expect, it } from 'vitest';
import { loadFavourites, toggleFavourite } from './favourites.ts';

const FAVOURITES_KEY = 'booking.favourites';

describe('favourites', () => {
  it('is empty when nothing is stored or the stored value is invalid', () => {
    expect(loadFavourites()).toEqual([]);
    localStorage.setItem(FAVOURITES_KEY, '{not json');
    expect(loadFavourites()).toEqual([]);
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['a', 2, null, 'b']));
    expect(loadFavourites()).toEqual(['a', 'b']);
  });

  it('adds a product on the first toggle and removes it on the second', () => {
    expect(toggleFavourite('a')).toEqual(['a']);
    expect(toggleFavourite('b')).toEqual(['a', 'b']);
    expect(loadFavourites()).toEqual(['a', 'b']);

    expect(toggleFavourite('a')).toEqual(['b']);
    expect(loadFavourites()).toEqual(['b']);
  });
});

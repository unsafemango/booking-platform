import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFavourites, toggleFavourite } from './favourites.ts';

const FAVOURITES_KEY = 'booking.favourites';

describe('favourites', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is empty when nothing is stored or the stored value is invalid', () => {
    expect(loadFavourites()).toEqual([]);
    localStorage.setItem(FAVOURITES_KEY, '{not json');
    expect(loadFavourites()).toEqual([]);
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['a', 2, null, 'b']));
    expect(loadFavourites()).toEqual(['a', 'b']);
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify({ a: true }));
    expect(loadFavourites()).toEqual([]);
  });

  it('adds a product on the first toggle and removes it on the second', () => {
    expect(toggleFavourite('a')).toEqual(['a']);
    expect(toggleFavourite('b')).toEqual(['a', 'b']);
    expect(loadFavourites()).toEqual(['a', 'b']);

    expect(toggleFavourite('a')).toEqual(['b']);
    expect(loadFavourites()).toEqual(['b']);
  });

  it('still returns the new list when storage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(toggleFavourite('a')).toEqual(['a']);
    expect(loadFavourites()).toEqual([]);
  });

  it('is empty when storage cannot be read', () => {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['a']));
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(loadFavourites()).toEqual([]);
  });
});

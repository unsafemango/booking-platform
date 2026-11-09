import { describe, expect, it } from 'vitest';
import { safeNext, withNext } from './safeNext.ts';

describe('safeNext', () => {
  it('keeps paths on this site, with their query and hash', () => {
    expect(safeNext('/cart')).toBe('/cart');
    expect(safeNext('/orders?status=PLACED&page=2#top')).toBe('/orders?status=PLACED&page=2#top');
  });

  it('goes home when there is no next param', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext('')).toBe('/');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    '/.//evil.example',
    'javascript:alert(1)',
    'cart',
  ])('rejects %j', (next) => {
    expect(safeNext(next)).toBe('/');
  });
});

describe('withNext', () => {
  it('encodes next so its query string survives', () => {
    expect(withNext('/login', '/?q=loft&sort=price#top')).toBe(
      '/login?next=%2F%3Fq%3Dloft%26sort%3Dprice%23top',
    );
  });

  it('leaves the path alone when there is no next', () => {
    expect(withNext('/login', null)).toBe('/login');
    expect(withNext('/login', '')).toBe('/login');
  });
});

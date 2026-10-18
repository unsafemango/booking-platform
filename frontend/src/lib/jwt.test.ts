import { describe, expect, it } from 'vitest';
import { makeJwt } from '../test/jwt.ts';
import { tokenExpiresAt } from './jwt.ts';

describe('tokenExpiresAt', () => {
  it('reads exp in milliseconds', () => {
    expect(tokenExpiresAt(makeJwt(1_800_000_000_000))).toBe(1_800_000_000_000);
  });

  it('decodes base64url payloads that need padding', () => {
    const payload = btoa(JSON.stringify({ exp: 1, name: '??>' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(tokenExpiresAt(`h.${payload}.s`)).toBe(1000);
  });

  it('returns null for tokens that are not JWTs or have no numeric exp', () => {
    expect(tokenExpiresAt('jwt-123')).toBeNull();
    expect(tokenExpiresAt('a.%%%.c')).toBeNull();
    expect(tokenExpiresAt(`a.${btoa(JSON.stringify({ exp: 'soon' }))}.c`)).toBeNull();
  });
});

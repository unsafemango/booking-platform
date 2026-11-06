import { describe, expect, it } from 'vitest';
import { passwordStrength, passwordStrengthLabel } from './passwordStrength.ts';

describe('passwordStrength', () => {
  it('flags passwords under eight characters as too short', () => {
    expect(passwordStrength('')).toBe('too-short');
    expect(passwordStrength('Ab1!xyz')).toBe('too-short');
  });

  it('rates a single kind of character as weak', () => {
    expect(passwordStrength('abcdefgh')).toBe('weak');
    expect(passwordStrength('12345678')).toBe('weak');
  });

  it('rates mixed letters and digits as fair', () => {
    expect(passwordStrength('Secret123')).toBe('fair');
  });

  it('rates long or varied passwords as strong', () => {
    expect(passwordStrength('Secret123!')).toBe('strong');
    expect(passwordStrength('correcthorsebattery1')).toBe('strong');
  });

  it('has a readable label for each level', () => {
    expect(passwordStrengthLabel('too-short')).toMatch(/at least 8/);
    expect(passwordStrengthLabel('strong')).toBe('Strong password');
  });
});

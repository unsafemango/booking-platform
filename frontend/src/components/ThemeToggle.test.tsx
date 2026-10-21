import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, loadTheme, saveTheme } from '../lib/theme.ts';
import ThemeToggle from './ThemeToggle.tsx';

const THEME_KEY = 'booking.theme';
const root = document.documentElement;

afterEach(() => {
  root.removeAttribute('data-theme');
  vi.restoreAllMocks();
});

describe('theme storage', () => {
  it('defaults to system when nothing or something invalid is saved', () => {
    expect(loadTheme()).toBe('system');
    localStorage.setItem(THEME_KEY, 'sepia');
    expect(loadTheme()).toBe('system');
  });

  it('loads a saved theme', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(loadTheme()).toBe('dark');
  });

  it('falls back to system when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadTheme()).toBe('system');
  });

  it('applies light and dark via data-theme and clears it for system', () => {
    applyTheme('dark');
    expect(root).toHaveAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(root).toHaveAttribute('data-theme', 'light');
    applyTheme('system');
    expect(root).not.toHaveAttribute('data-theme');
  });

  it('saves an explicit choice and forgets it for system', () => {
    saveTheme('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    saveTheme('system');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('still applies the theme when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveTheme('dark')).not.toThrow();
    expect(root).toHaveAttribute('data-theme', 'dark');
  });
});

describe('ThemeToggle', () => {
  it('offers system, light and dark, starting from the saved choice', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    render(<ThemeToggle />);
    const select = screen.getByRole('combobox', { name: 'Colour theme' });
    expect(select).toHaveValue('dark');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
  });

  it('applies and saves the chosen theme', () => {
    render(<ThemeToggle />);
    const select = screen.getByRole('combobox', { name: 'Colour theme' });
    expect(select).toHaveValue('system');

    fireEvent.change(select, { target: { value: 'light' } });
    expect(select).toHaveValue('light');
    expect(root).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');

    fireEvent.change(select, { target: { value: 'system' } });
    expect(root).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });
});

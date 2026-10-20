export type Theme = 'system' | 'light' | 'dark';

export const THEMES: Theme[] = ['system', 'light', 'dark'];

const THEME_KEY = 'booking.theme';

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as string[]).includes(value);
}

/** The theme saved in this browser, or "system" when none (or storage is unavailable). */
export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Sets data-theme on <html>; "system" removes it so the prefers-color-scheme rules apply. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    if (theme === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable; the choice just won't survive a reload
  }
}

import { useState } from 'react';
import { loadTheme, saveTheme, THEMES, type Theme } from '../lib/theme.ts';

const LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  return (
    <select
      className="theme-select"
      aria-label="Colour theme"
      value={theme}
      onChange={(e) => {
        const next = e.target.value as Theme;
        setTheme(next);
        saveTheme(next);
      }}
    >
      {THEMES.map((t) => (
        <option key={t} value={t}>
          {LABELS[t]}
        </option>
      ))}
    </select>
  );
}

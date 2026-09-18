import { signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'pwa-pocket-theme';

export const themeMode = signal<ThemeMode>('system');
export const resolvedTheme = signal<'light' | 'dark'>('light');

let systemPrefersDark = false;

function apply() {
  const mode = themeMode();
  const resolved = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;
  resolvedTheme.set(resolved);
  document.documentElement.setAttribute('data-theme', resolved);
}

export function setThemeMode(mode: ThemeMode) {
  themeMode.set(mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be unavailable (private browsing); the choice just won't persist.
  }
  apply();
}

// Called once from the App component: reads the stored preference, starts watching
// prefers-color-scheme for "system" mode, and applies the resolved theme immediately
// so the very first render already matches the system setting.
export function initTheme() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Ignore and fall back to "system" below.
  }
  themeMode.set(stored === 'light' || stored === 'dark' ? stored : 'system');
  const media = matchMedia('(prefers-color-scheme: dark)');
  systemPrefersDark = media.matches;
  media.addEventListener('change', (e) => {
    systemPrefersDark = e.matches;
    apply();
  });
  apply();
}

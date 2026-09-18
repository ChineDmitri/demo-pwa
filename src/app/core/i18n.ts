import { signal } from '@angular/core';
import { en } from './i18n-en';
import { fr } from './i18n-fr';
import { es } from './i18n-es';
import { it } from './i18n-it';

export type Locale = 'en' | 'fr' | 'es' | 'it';

export const SUPPORTED_LOCALES: readonly { code: Locale; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'es', nativeName: 'Español' },
  { code: 'it', nativeName: 'Italiano' },
];

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, fr, es, it };
const STORAGE_KEY = 'pwa-pocket-locale';

// Static default (not system-detected) so unit tests that call device.ts/weather.ts/pwa.ts
// helpers directly, without bootstrapping the app, keep seeing the original French copy.
export const locale = signal<Locale>('fr');

export function t(key: string, vars?: Record<string, string | number>): string {
  let text = DICTIONARIES[locale()][key] ?? DICTIONARIES.fr[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{{${name}}}`, String(value));
    }
  }
  return text;
}

export function setLocale(next: Locale) {
  locale.set(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (private browsing); the choice just won't persist.
  }
  document.documentElement.lang = next;
}

function detectSystemLocale(): Locale {
  const supported: Locale[] = ['en', 'fr', 'es', 'it'];
  const lang = navigator.language?.slice(0, 2).toLowerCase() as Locale;
  return supported.includes(lang) ? lang : 'fr';
}

// Called once from the App component so the real app adapts to the stored choice or the
// system language from the very first render, while leaving the module's static default
// (above) untouched for anything that imports `t` without bootstrapping Angular.
export function initI18n() {
  let initial: Locale | null = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'fr' || stored === 'es' || stored === 'it') initial = stored;
  } catch {
    // Ignore and fall back to system detection below.
  }
  locale.set(initial ?? detectSystemLocale());
  document.documentElement.lang = locale();
}

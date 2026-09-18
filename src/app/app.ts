import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Network } from './core/network';
import { Pwa } from './core/pwa';
import { version } from '../../package.json';
import { installTouchBehavior } from './core/touch-behavior';
import { t, locale, setLocale, initI18n, SUPPORTED_LOCALES, Locale } from './core/i18n';
import { themeMode, resolvedTheme, setThemeMode, initTheme, ThemeMode } from './core/theme';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly version = version;
  t = t;
  locale = locale;
  themeMode = themeMode;
  resolvedTheme = resolvedTheme;
  supportedLocales = SUPPORTED_LOCALES;
  themeOptions: ThemeMode[] = ['system', 'light', 'dark'];
  themeMenuOpen = signal(false);
  langMenuOpen = signal(false);
  constructor() {
    initI18n();
    initTheme();
    inject(DestroyRef).onDestroy(installTouchBehavior());
    const closeMenus = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('.menu-trigger, .menu-panel')) return;
      this.themeMenuOpen.set(false);
      this.langMenuOpen.set(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.themeMenuOpen.set(false);
        this.langMenuOpen.set(false);
      }
    };
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('click', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    });
  }
  network = inject(Network);
  pwa = inject(Pwa);
  links = [
    { path: '/', labelKey: 'nav.home', icon: '⌂' },
    { path: '/decouvrir', labelKey: 'nav.discover', icon: '◫' },
    { path: '/capteurs', labelKey: 'nav.sensors', icon: '⌖' },
    { path: '/photos', labelKey: 'nav.photos', icon: '▣' },
    { path: '/meteo', labelKey: 'nav.weather', icon: '☀' },
  ];
  toggleThemeMenu() {
    this.langMenuOpen.set(false);
    this.themeMenuOpen.update((v) => !v);
  }
  toggleLangMenu() {
    this.themeMenuOpen.set(false);
    this.langMenuOpen.update((v) => !v);
  }
  chooseTheme(mode: ThemeMode) {
    setThemeMode(mode);
    this.themeMenuOpen.set(false);
  }
  chooseLocale(code: Locale) {
    setLocale(code);
    this.langMenuOpen.set(false);
  }
}

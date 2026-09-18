import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { t } from './i18n';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
@Injectable({ providedIn: 'root' })
export class Pwa {
  readonly installed = signal(
    matchMedia('(display-mode: standalone)').matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone,
  );
  readonly installPrompt = signal<InstallPrompt | null>(null);
  readonly updateReady = signal(false);
  readonly offlineReady = signal(false);
  private updates = inject(SwUpdate);
  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt.set(e as InstallPrompt);
    });
    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.installPrompt.set(null);
    });
    if (this.updates.isEnabled) {
      void this.prepareOffline();
      this.updates.versionUpdates.subscribe((e) => {
        if (e.type === 'VERSION_READY') this.updateReady.set(true);
      });
      window.addEventListener('online', () => void this.prepareOffline());
    }
  }
  private async prepareOffline() {
    try {
      await navigator.serviceWorker.ready;
      // A registered worker is not enough: wait for Angular's prefetch to complete.
      await this.updates.checkForUpdate().catch(() => false);
      // Associate this first-load client with its cached version, so it receives update events.
      await fetch(new URL('index.html', document.baseURI));
      const assets = [
        new URL('index.html', document.baseURI).href,
        new URL('manifest.webmanifest', document.baseURI).href,
        new URL('icons/icon-192x192.png', document.baseURI).href,
        ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(
          (s) => s.src,
        ),
        ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')).map(
          (l) => l.href,
        ),
      ];
      const cached = await Promise.all(assets.map((url) => caches.match(url)));
      this.offlineReady.set(cached.every((response) => !!response?.ok));
    } catch {
      this.offlineReady.set(false);
    }
  }
  async install() {
    const prompt = this.installPrompt();
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } finally {
      this.installPrompt.set(null);
    }
  }
  reload() {
    location.reload();
  }
}
export async function testNotification(): Promise<string> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return t('pwa.notif.unsupported');
  }
  try {
    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== 'granted') return t('pwa.notif.permissionDenied');
    const registration = await navigator.serviceWorker.getRegistration(
      new URL('.', document.baseURI).href,
    );
    if (!registration?.active) return t('pwa.notif.swPreparing');
    await registration.showNotification(t('pwa.notif.title'), {
      body: t('pwa.notif.body'),
      icon: new URL('icons/icon-192x192.png', document.baseURI).href,
      tag: 'pwa-pocket-demo',
    });
    return t('pwa.notif.sent');
  } catch {
    return t('pwa.notif.testFailed');
  }
}

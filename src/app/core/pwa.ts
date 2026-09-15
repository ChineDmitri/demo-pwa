import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
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
    return 'Notifications système indisponibles ici. Sur iPhone, ajoutez cette application à l’écran d’accueil puis ouvrez-la depuis son icône.';
  }
  try {
    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== 'granted')
      return 'Notifications non autorisées. Vous pouvez modifier ce choix dans les réglages du navigateur.';
    const registration = await navigator.serviceWorker.getRegistration(
      new URL('.', document.baseURI).href,
    );
    if (!registration?.active)
      return 'Le mode PWA se prépare. Rechargez la version publiée puis réessayez.';
    await registration.showNotification('Un petit bonjour de PWA Pocket 👋', {
      body: 'Une notification depuis votre application web. Simple comme un clic !',
      icon: new URL('icons/icon-192x192.png', document.baseURI).href,
      tag: 'pwa-pocket-demo',
    });
    return 'Notification système envoyée. Son affichage dépend aussi des réglages du téléphone (mode silencieux, concentration…).';
  } catch {
    return 'Ce navigateur ne permet pas ce test. Sur iPhone, essayez depuis l’application ajoutée à l’écran d’accueil.';
  }
}

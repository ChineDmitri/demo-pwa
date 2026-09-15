import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class Network {
  readonly online = signal(navigator.onLine);
  private checking?: Promise<boolean>;
  constructor() {
    window.addEventListener('offline', () => this.online.set(false));
    window.addEventListener('online', () => void this.check());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.check();
    });
    setInterval(() => {
      if (!document.hidden) void this.check();
    }, 30000);
    void this.check();
  }
  check(): Promise<boolean> {
    if (!navigator.onLine) {
      this.online.set(false);
      return Promise.resolve(false);
    }
    if (this.checking) return this.checking;
    this.checking = this.probe().finally(() => (this.checking = undefined));
    return this.checking;
  }
  private async probe(): Promise<boolean> {
    try {
      const url = new URL('connectivity.txt', document.baseURI);
      url.searchParams.set('ngsw-bypass', 'true');
      url.searchParams.set('t', String(Date.now()));
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      this.online.set(
        navigator.onLine && response.ok && (await response.text()).trim() === 'pwa-pocket-online',
      );
    } catch {
      this.online.set(false);
    }
    return this.online();
  }
}

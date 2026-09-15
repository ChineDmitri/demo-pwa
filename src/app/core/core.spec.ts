import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { locate } from './device';
import { Network } from './network';
import { PhotosStore } from './photos-store';
import { WeatherApi } from './weather';
import { testNotification } from './pwa';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Autorisations', () => {
  it('explique le refus de géolocalisation', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_ok: unknown, fail: (e: { code: number }) => void) =>
          fail({ code: 1 }),
      },
    });
    await expect(locate()).rejects.toThrow('refusé');
  });
  it('explique une recherche de position trop longue', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_ok: unknown, fail: (e: { code: number }) => void) =>
          fail({ code: 3 }),
      },
    });
    await expect(locate()).rejects.toThrow('trop de temps');
  });
  it('ne demande pas à nouveau une permission de notification refusée', async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal('Notification', { permission: 'denied', requestPermission });
    vi.stubGlobal('navigator', { serviceWorker: {} });
    expect(await testNotification()).toContain('non autorisées');
    expect(requestPermission).not.toHaveBeenCalled();
  });
  it('explique les notifications indisponibles', async () => {
    vi.stubGlobal('navigator', {});
    expect(await testNotification()).toContain('indisponibles');
  });
});

describe('Connexion réelle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { onLine: true });
  });
  it('identifie un portail captif et contourne le cache du service worker', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: async () => '<html>Connexion Wi-Fi</html>' });
    vi.stubGlobal('fetch', fetchMock);
    const network = new Network();
    expect(await network.check()).toBe(false);
    expect(String(fetchMock.mock.calls[0][0])).toContain('ngsw-bypass=true');
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  });
  it('retrouve le réseau après une panne', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue({ ok: true, text: async () => 'pwa-pocket-online\n' });
    vi.stubGlobal('fetch', fetchMock);
    const network = new Network();
    expect(await network.check()).toBe(false);
    expect(await network.check()).toBe(true);
  });
  it('ne tente pas de requête lorsque le navigateur est hors ligne', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await new Network().check()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Météo', () => {
  it('distingue une erreur du fournisseur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(new WeatherApi().current(48, 2)).rejects.toThrow('service météo');
  });
  it('refuse des données incomplètes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ current: { temperature_2m: 24 } }) }),
    );
    await expect(new WeatherApi().current(48, 2)).rejects.toThrow('incomplètes');
  });
  it('transmet les coordonnées et conserve les unités choisies', async () => {
    const current = {
      temperature_2m: 24,
      apparent_temperature: 25,
      relative_humidity_2m: 60,
      wind_speed_10m: 12,
      weather_code: 0,
      time: 1789450000,
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ current }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await new WeatherApi().current(48.5, 2.3)).toEqual(current);
    expect(String(fetchMock.mock.calls[0][0])).toContain('latitude=48.5');
  });
});

describe('Galerie IndexedDB', () => {
  beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));
  it('conserve les photos après la recréation du service et permet leur suppression', async () => {
    const photo = {
      id: 'photo-1',
      created: 123,
      blob: new Blob(['photo'], { type: 'image/jpeg' }),
    };
    await new PhotosStore().save(photo);
    const reopened = new PhotosStore();
    expect((await reopened.list()).map((p) => p.id)).toEqual(['photo-1']);
    await reopened.remove(photo.id);
    expect(await new PhotosStore().list()).toEqual([]);
  });
  it('remonte une impossibilité d’ouvrir le stockage', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new DOMException('Quota atteint', 'QuotaExceededError');
      },
    });
    await expect(new PhotosStore().save({ id: 'x', created: 1, blob: new Blob() })).rejects.toThrow(
      'Quota',
    );
  });
});

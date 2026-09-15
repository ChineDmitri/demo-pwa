import { test, expect } from '@playwright/test';

test('toutes les pages et la galerie restent disponibles après rechargement hors ligne', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByText('✓ Prête hors ligne', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Photos', exact: true }).first().click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByText('Photo enregistrée sur cet appareil ✓')).toBeVisible();
  await expect(page.locator('.gallery-item')).toHaveCount(1);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.offline-banner')).toContainText('Vous êtes hors connexion');
  await expect(page.locator('.gallery-item')).toHaveCount(1);
  for (const name of ['Accueil', 'Découvrir', 'Capteurs', 'Météo']) {
    await page.getByRole('link', { name, exact: true }).first().click();
    await expect(page.locator('h1')).toBeVisible();
  }
  await expect(page.getByText('Connectez-vous à Internet pour consulter la météo.')).toBeVisible();
  await page.getByRole('link', { name: 'Découvrir', exact: true }).first().click();
  await page.getByRole('button', { name: 'Ouvrir une pop-up' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('.offline-banner')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('position refusée, capteur sans réponse et absence de demande au démarrage', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      value: async () => 'granted',
      configurable: true,
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_: unknown, fail: (e: { code: number }) => void) => fail({ code: 1 }),
      },
    });
  });
  await page.goto('./#/capteurs');
  await expect(page.getByText('Accès à la position refusé.', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Obtenir ma position' }).click();
  await expect(page.getByText('Accès à la position refusé.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Activer l’inclinaison' }).click();
  await expect(page.getByText('Aucune mesure reçue.', { exact: false })).toBeVisible({
    timeout: 8000,
  });
});

test('météo réelle simulée puis erreur fournisseur, distincte du hors ligne', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 48.8566, longitude: 2.3522 });
  await context.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        current: {
          temperature_2m: 24,
          apparent_temperature: 25,
          relative_humidity_2m: 60,
          wind_speed_10m: 12,
          weather_code: 0,
          time: 1789450000,
        },
      },
    }),
  );
  await page.goto('./#/meteo');
  await page.getByRole('button', { name: 'Voir la météo ici' }).click();
  await expect(page.getByRole('heading', { name: 'Ciel dégagé' })).toBeVisible();
  await context.route('https://api.open-meteo.com/**', (route) => route.fulfill({ status: 503 }));
  await page.getByRole('button', { name: 'Actualiser la météo' }).click();
  await expect(
    page.getByText('Le service météo est momentanément indisponible. Réessayez.'),
  ).toBeVisible();
  await expect(page.locator('.offline-banner')).toHaveCount(0);
});

test('galerie : aperçu, export, annulation puis suppression persistante', async ({ page }) => {
  await page.goto('./#/photos');
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('.gallery-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Agrandir la photo' }).click();
  await expect(page.getByRole('dialog', { name: 'Aperçu de la photo' })).toBeVisible();
  await page.keyboard.press('Escape');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger cette photo' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.jpg$/);
  await page.getByRole('button', { name: 'Supprimer cette photo' }).click();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('.gallery-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Supprimer cette photo' }).click();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(page.locator('.gallery-item')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.gallery-item')).toHaveCount(0);
});

test('présentation mobile sans débordement et navigation inférieure', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('.bottom-nav')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/accueil-mobile.png', fullPage: true });
  await page.locator('.bottom-nav').getByRole('link', { name: 'Capteurs' }).click();
  await expect(
    page.getByRole('heading', { name: 'À vous de faire bouger les choses.' }),
  ).toBeVisible();
});

test('caméra simulée : capture puis arrêt des pistes lors de la navigation', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#2459e0';
      ctx.fillRect(0, 0, 640, 480);
      return canvas.captureStream(5);
    };
  });
  await page.goto('./#/photos');
  await page.getByRole('button', { name: 'Activer la caméra' }).click();
  await expect(page.getByRole('button', { name: 'Prendre une photo', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    (window as unknown as { cameraTracks: MediaStreamTrack[] }).cameraTracks = (
      document.querySelector('video')!.srcObject as MediaStream
    ).getTracks();
  });
  await page.getByRole('button', { name: 'Prendre une photo', exact: true }).click();
  await expect(page.locator('.gallery-item')).toHaveCount(1);
  await page.getByRole('link', { name: 'Accueil', exact: true }).first().click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { cameraTracks: MediaStreamTrack[] }).cameraTracks.every(
        (t) => t.readyState === 'ended',
      ),
    ),
  ).toBe(true);
});

test('stockage plein : aperçu et téléchargement de secours restent disponibles', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      if (this.name === 'photos') throw new DOMException('Stockage plein', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await page.goto('./#/photos');
  await page.locator('input[type=file]').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByText('Stockage plein ou indisponible.', { exact: false })).toBeVisible();
  await expect(page.locator('.latest-photo img')).toBeVisible();
  await expect(page.locator('.gallery-item')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.jpg$/);
});

test('notification : appel système simulé via le service worker', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
    ServiceWorkerRegistration.prototype.showNotification = async function (title, options) {
      (window as unknown as { lastNotification: unknown }).lastNotification = {
        title,
        options,
        active: !!this.active,
      };
    };
  });
  await page.goto('./');
  await expect(page.getByText('✓ Prête hors ligne', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Découvrir', exact: true }).first().click();
  await page.getByRole('button', { name: 'Tester une notification' }).click();
  await expect(page.getByText('Notification système envoyée.', { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { lastNotification: unknown }).lastNotification,
    ),
  ).toMatchObject({
    title: 'Un petit bonjour de PWA Pocket 👋',
    active: true,
    options: {
      tag: 'pwa-pocket-demo',
      icon: 'http://localhost:4173/pwa-pocket/icons/icon-192x192.png',
    },
  });
});

test('portail captif détecté sans confondre Wi-Fi et accès Internet', async ({ page, context }) => {
  await context.route('**/connectivity.txt?*', (route) =>
    route.fulfill({ body: '<html>Connectez-vous au Wi-Fi</html>' }),
  );
  await page.goto('./');
  await expect(page.locator('.offline-banner')).toBeVisible();
  await context.route('**/connectivity.txt?*', (route) =>
    route.fulfill({ body: 'pwa-pocket-online' }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('.offline-banner')).toHaveCount(0);
});

test('nouvelle version du service worker annoncée puis chargée', async ({ page }) => {
  const { readFile, writeFile } = await import('node:fs/promises');
  const manifestPath = 'dist/pwa-pocket/browser/ngsw.json';
  const original = await readFile(manifestPath, 'utf8');
  await page.goto('./');
  await expect(page.getByText('✓ Prête hors ligne', { exact: true })).toBeVisible();
  try {
    const manifest = JSON.parse(original);
    manifest.timestamp += 1;
    await writeFile(manifestPath, JSON.stringify(manifest));
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByText('Une nouvelle version est prête.', { exact: false })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: 'Actualiser l’application' }).click();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.update-banner')).toHaveCount(0);
  } finally {
    await writeFile(manifestPath, original);
  }
});

test('version affichée et gestes natifs bloqués sans empêcher la navigation', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  const { version } = JSON.parse(await readFile('package.json', 'utf8'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('.app-version')).toHaveText('Version ' + version);
  const result = await page.evaluate(() => {
    const link = document.querySelector('.bottom-nav a')!;
    const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    const double = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    const gesture = new Event('gesturestart', { bubbles: true, cancelable: true });
    const pinch = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(pinch, 'touches', { value: [{}, {}] });
    const single = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(single, 'touches', { value: [{}] });
    link.dispatchEvent(context);
    link.dispatchEvent(double);
    document.dispatchEvent(gesture);
    document.dispatchEvent(pinch);
    document.dispatchEvent(single);
    return {
      context: context.defaultPrevented,
      double: double.defaultPrevented,
      gesture: gesture.defaultPrevented,
      pinch: pinch.defaultPrevented,
      single: single.defaultPrevented,
      touchAction: getComputedStyle(document.body).touchAction,
    };
  });
  expect(result).toEqual({
    context: true,
    double: true,
    gesture: true,
    pinch: true,
    single: false,
    touchAction: 'pan-x pan-y',
  });
  await page.locator('.bottom-nav').getByRole('link', { name: 'Photos' }).click();
  await expect(
    page.getByText('Chaque photo est automatiquement enregistrée', { exact: false }),
  ).toBeVisible();
});

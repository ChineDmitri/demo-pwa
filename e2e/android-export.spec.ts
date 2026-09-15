import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const source of ['camera-offline', 'file'] as const) {
  test(
    'Android : téléchargement automatique et copie locale (' + source + ')',
    async ({ page, context }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36',
        });
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
      await page.goto('./');
      await expect(page.getByText('✓ Prête hors ligne', { exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Photos', exact: true }).first().click();
      let downloadCount = 0;
      page.on('download', () => downloadCount++);
      const downloaded = page.waitForEvent('download');
      if (source === 'camera-offline') {
        await context.setOffline(true);
        await page.getByRole('button', { name: 'Activer la caméra' }).click();
        const capture = page.getByRole('button', { name: 'Prendre une photo', exact: true });
        await expect(capture).toBeEnabled();
        await capture.click();
      } else {
        await page.locator('input[type=file]').setInputFiles({
          name: 'test.png',
          mimeType: 'image/png',
          buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
            'base64',
          ),
        });
      }
      const download = await downloaded;
      expect(download.suggestedFilename()).toMatch(/^pwa-pocket-\d+\.jpg$/);
      const jpeg = await readFile((await download.path())!);
      expect([...jpeg.subarray(0, 3)]).toEqual([255, 216, 255]);
      await expect(page.locator('.gallery-item')).toHaveCount(1);
      await expect(page.getByText('Téléchargement JPEG demandé', { exact: false })).toBeVisible();
      await page.reload();
      await expect(page.locator('.gallery-item')).toHaveCount(1);
      expect(downloadCount).toBe(1);
    },
  );
}

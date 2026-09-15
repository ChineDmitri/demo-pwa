import { test, expect } from '@playwright/test';

for (const mode of ['supported', 'unsupported', 'error', 'cancel'] as const) {
  test('export iPhone : ' + mode, async ({ page }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      });
      Object.defineProperty(navigator, 'canShare', {
        value: () => mode !== 'unsupported',
        configurable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: async (data: ShareData) => {
          (window as unknown as { sharedPhoto: unknown }).sharedPhoto = {
            name: data.files?.[0].name,
            type: data.files?.[0].type,
            size: data.files?.[0].size,
            active: navigator.userActivation.isActive,
          };
          if (mode === 'error') throw new DOMException('Blocked', 'NotAllowedError');
          if (mode === 'cancel') throw new DOMException('Canceled', 'AbortError');
        },
        configurable: true,
      });
    }, mode);
    await page.goto('./#/photos');
    await page
      .locator('input[type=file]')
      .setInputFiles({
        name: 'test.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
          'base64',
        ),
      });
    await expect(page.locator('.gallery-item')).toHaveCount(1);
    const downloads: string[] = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));
    await page
      .getByRole('button', { name: 'Enregistrer sur l’iPhone / iPad', exact: true })
      .click();
    if (mode === 'supported') {
      await expect(page.getByText('Feuille de partage fermée.', { exact: false })).toBeVisible();
      expect(
        await page.evaluate(() => (window as unknown as { sharedPhoto: unknown }).sharedPhoto),
      ).toMatchObject({
        name: expect.stringMatching(/\.jpg$/),
        type: 'image/jpeg',
        size: expect.any(Number),
        active: true,
      });
    } else if (mode === 'cancel') {
      await expect(page.getByText('Partage annulé.', { exact: false })).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Enregistrer votre photo' })).not.toBeVisible();
    } else {
      await expect(page.getByRole('dialog', { name: 'Enregistrer votre photo' })).toBeVisible();
      expect(
        await page.locator('.export-image').evaluate((img) => {
          const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
          img.dispatchEvent(event);
          return event.defaultPrevented;
        }),
      ).toBe(false);
      expect(
        await page.getByRole('button', { name: 'Fermer l’enregistrement' }).evaluate((button) => {
          const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
          button.dispatchEvent(event);
          return event.defaultPrevented;
        }),
      ).toBe(true);
    }
    expect(downloads).toEqual([]);
    await expect(page.locator('.gallery-item')).toHaveCount(1);
  });
}

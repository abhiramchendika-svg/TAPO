import { expect, test } from '@playwright/test';

const PAGES = [
  ['/', /Every card/],
  ['/product/', /One app/],
  ['/security/', /never collect/],
  ['/faq/', /Questions, answered/],
] as const;

test.describe('public marketing pages', () => {
  for (const [path, heading] of PAGES) {
    test(`${path} is public, pre-rendered and shareable`, async ({ page, request }) => {
      // Pre-rendered: the heading is in the HTML itself, before any script runs.
      const html = await (await request.get(path)).text();
      expect(html).toMatch(heading);
      expect(html).toContain('property="og:image"');
      expect(html).toContain('<meta name="description"');

      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      await expect(page.getByRole('link', { name: /Open TAPO/ }).first()).toBeVisible();
      // No sign-in wall on marketing pages.
      await expect(page.getByRole('textbox', { name: 'Password' })).toHaveCount(0);
    });
  }

  test('unknown pages return 404', async ({ request }) => {
    const res = await request.get('/no-such-page/');
    expect(res.status()).toBe(404);
  });

  test('the app sits behind sign-in', async ({ page }) => {
    await page.goto('/app/insights');
    await expect(page).toHaveURL(/\/app\/sign-in/);
  });
});

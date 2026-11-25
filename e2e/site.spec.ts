import { expect, test } from '@playwright/test';

const PAGES = [
  ['/', /Every card/],
  ['/product/', /One app/],
  ['/showcase/', /Tap a demo tag/],
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

  test('showcase: the demo flow can be stepped through and paused', async ({ page }) => {
    await page.goto('/showcase/');
    const stage = page.locator('#scStage');
    // Safety copy is part of the page, not only the animation.
    await expect(page.getByText('Demo mode — no real money is charged')).toBeAttached();
    await expect(page.getByText(/No bank card is read and no payment is processed/)).toBeVisible();

    await page.getByRole('button', { name: /Simulated checkout/ }).click();
    await expect(stage).toHaveAttribute('data-step', '2');
    await expect(page.getByRole('button', { name: /Simulated checkout/ })).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#scLive')).toContainText('Step 3 of 4');
    // Choosing a step pauses autoplay.
    await page.waitForTimeout(3000);
    await expect(stage).toHaveAttribute('data-step', '2');
    await expect(page.getByRole('button', { name: 'Play the animation' })).toBeVisible();
  });

  test('showcase: reduced motion shows the finished flow without autoplay', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/showcase/');
    await page.waitForTimeout(2500);
    await expect(page.locator('#scStage')).toHaveAttribute('data-step', '3');
    await context.close();
  });
});

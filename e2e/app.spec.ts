import { expect, test } from '@playwright/test';

import { createAccount, TEST_PASSWORD } from './helpers';

test('sign-up stores the wallet encrypted, never in plain text', async ({ page }) => {
  await createAccount(page);
  // Let the encrypted save complete.
  await page.waitForTimeout(800);
  const stored = await page.evaluate(() => {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      out[k] = localStorage.getItem(k)!;
    }
    return out;
  });
  const walletKey = Object.keys(stored).find((k) => k.startsWith('tapo/users/'));
  expect(walletKey).toBeTruthy();
  const wallet = stored[walletKey!]!;
  expect(wallet).toContain('"alg":"AES-256-GCM"');
  expect(wallet).not.toContain('Everyday Cashback');
  // The password is never stored anywhere.
  expect(JSON.stringify(stored)).not.toContain(TEST_PASSWORD);
});

test('a refresh keeps you signed in; a new browser session needs the password', async ({ page, browser }) => {
  const email = await createAccount(page);
  await page.reload();
  await expect(page.getByText('Test User').first()).toBeVisible();
  expect(page.url()).not.toContain('sign-in');

  // Same storage, new tab session: the account exists, but the key is gone.
  const state = await page.context().storageState();
  const other = await browser.newContext({ storageState: state });
  const p2 = await other.newPage();
  await p2.goto('/app/');
  await expect(p2).toHaveURL(/\/app\/sign-in/);
  await p2.getByRole('textbox', { name: 'Email' }).fill(email);
  await p2.getByRole('textbox', { name: 'Password', exact: true }).fill('wrong-pass-999');
  await p2.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(p2.getByText('Email or password is incorrect.')).toBeVisible();
  await p2.getByRole('textbox', { name: 'Password', exact: true }).fill(TEST_PASSWORD);
  await p2.getByRole('button', { name: 'Sign in', exact: true }).click();
  // The encrypted wallet opens with the right password.
  await expect(p2.getByText('Test User').first()).toBeVisible();
  await other.close();
});

test('card finder recommends the best card', async ({ page }) => {
  await createAccount(page);
  await page.goto('/app/recommend?category=groceries&amount=1000');
  await expect(page.getByText(/Everyday Cashback is estimated to earn ₹50\.00 on a ₹1,000 purchase/)).toBeVisible();
});

test('one tap on Wallet shows the card to use, with no amount to type', async ({ page }) => {
  await createAccount(page);
  await page.getByRole('radiogroup', { name: 'What are you buying?' }).getByRole('radio', { name: 'Groceries' }).click();
  const answer = page.getByRole('button', { name: /^Use Everyday Cashback\. 5% back on Groceries/ });
  await expect(answer).toBeVisible();
  // The answer opens the full comparison for the same category.
  await answer.click();
  await expect(page).toHaveURL(/\/app\/recommend\?category=groceries/);
  await expect(page.getByRole('heading', { name: 'Everyday Cashback' })).toBeVisible();
});

test('Best answers on a category tap, and the amount makes it exact', async ({ page }) => {
  await createAccount(page);
  await page.goto('/app/recommend');
  await page.getByRole('radiogroup', { name: 'Choose one' }).getByRole('radio', { name: 'Groceries' }).click();
  await expect(page.getByText('Use this card', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Everyday Cashback' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Amount in rupees' }).fill('1000');
  await expect(page.getByText(/Everyday Cashback is estimated to earn ₹50\.00 on a ₹1,000 purchase/)).toBeVisible();
});

test('statement import adds purchases', async ({ page }) => {
  await createAccount(page);
  await page.goto('/app/import');
  await page.getByRole('button', { name: 'Try example' }).click();
  await expect(page.getByText('Purchases found')).toBeVisible();
  await page.getByRole('button', { name: /^Import to / }).click();
  await expect(page.getByText('8 purchases imported')).toBeVisible();
});

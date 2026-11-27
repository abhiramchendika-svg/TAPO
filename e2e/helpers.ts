import { expect, type Page } from '@playwright/test';

// Test-only credentials for throwaway accounts in a fresh browser context.
export const TEST_PASSWORD = 'e2e-pass-1234';

/** Creates an account and stops on the welcome screens. */
export async function signUp(page: Page, email = `e2e-${Date.now()}@example.com`) {
  await page.goto('/app/');
  await expect(page).toHaveURL(/\/app\/sign-in/);
  // A fresh browser has no accounts, so the form opens in "Create account" mode.
  await page.getByRole('textbox', { name: 'Your name' }).fill('Test User');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(TEST_PASSWORD);
  await page.getByRole('textbox', { name: 'Confirm password' }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  // New accounts see the welcome screens first.
  await expect(page).toHaveURL(/\/app\/onboarding/);
  return email;
}

/** Creates an account that starts with the sample cards and sample spending. */
export async function createAccount(page: Page, email = `e2e-${Date.now()}@example.com`) {
  await signUp(page, email);
  // Skip goes to the last welcome page, where the person picks their own cards or the samples.
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'Explore with sample cards' }).click();
  await expect(page.getByText('Test User').first()).toBeVisible();
  return email;
}

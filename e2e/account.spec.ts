import { expect, test } from '@playwright/test';
test('login, signup and emailed-code screens are usable', async ({ page }) => {
  await page.route('**/api/me', route => route.fulfill({ status: 401, json: { error: 'Sign-in required.' } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.getByRole('button', { name: 'Create an account' }).click();
  await expect(page.getByRole('heading', { name: 'Start here.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue with Google/ })).toHaveAttribute('href', '/api/auth/google');
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.route('**/api/auth/password', route => route.fulfill({ json: { authenticated: false, challengeId: 'ae54b865-d596-47b9-9cb4-921e9be50889' } }));
  await page.getByLabel('Username').fill('approved');
  await page.getByLabel('Password', { exact: true }).fill('test password only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Confirmation code')).toBeVisible();
  await expect(page.getByLabel('Remember this browser for 30 days')).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('unapproved sign-in shows a clear error', async ({ page }) => {
  await page.route('**/api/me', route => route.fulfill({ status: 401, json: { error: 'Sign-in required.' } }));
  await page.goto('/?error=sign-in-denied');
  await expect(page.getByRole('status')).toContainText('Access is limited to approved Gmail accounts.');
});

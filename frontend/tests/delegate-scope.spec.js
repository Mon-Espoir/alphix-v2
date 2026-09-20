// @ts-check
// TEMPORARY: delegate sees edit/delete only on own class courses.
import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers.js';

const EMAIL = 'tmp_delui_l9Vwt@example.com';
const PASSWORD = 'tmp12345678';

test('delegate row gating by class', async ({ page }) => {
  const { token } = await loginViaApi(EMAIL, PASSWORD);
  await page.goto('/');
  await page.evaluate(({ t }) => localStorage.setItem('alphix.v2:auth:token', t), { t: token });
  await page.reload();
  await page.waitForTimeout(600);
  // Département 1 contient des cours BAC3 (classe du délégué) et BAC1 (hors classe).
  await page.goto('/courses?departmentId=1');
  await page.locator('tbody tr').first().waitFor({ timeout: 15000 });
  const rows = await page.locator('tbody tr').count();
  const editBtns = await page.locator('tbody tr a[aria-label^="Modifier"]').count();
  console.log(`ROWS:${rows} EDIT_BTNS:${editBtns}`);
  expect(rows).toBeGreaterThan(0);
  expect(editBtns).toBeGreaterThan(0);
  expect(editBtns).toBeLessThan(rows);
});

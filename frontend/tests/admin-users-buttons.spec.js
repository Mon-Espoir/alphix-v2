// @ts-check
// Admin users action buttons end-to-end (temp user created/deleted by the suite).
import { test, expect } from '@playwright/test';
import { API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD, loginViaApi } from './helpers.js';

const TMP_EMAIL = `tmp_uitest_${Date.now().toString(36)}@example.com`;
let tmpUserId = null;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_BASE}/register`, {
    data: { name: 'Tmp UITest', email: TMP_EMAIL, password: 'tmp12345678', password_confirmation: 'tmp12345678' },
  });
  if (res.status() !== 211 && res.status() !== 201) throw new Error(`register failed: ${res.status()}`);
  const body = await res.json();
  tmpUserId = body.user?.id ?? body.data?.user?.id ?? null;
  // Rattache au département 1 (pré-remplissage Nommer).
  const { token } = await loginViaApi(ADMIN_EMAIL, ADMIN_PASSWORD);
  await request.patch(`${API_BASE}/users/${tmpUserId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    data: { department_id: 1, faculty_id: 1 },
  });
});

test.afterAll(async ({ request }) => {
  if (tmpUserId == null) return;
  const { token } = await loginViaApi(ADMIN_EMAIL, ADMIN_PASSWORD);
  await request.delete(`${API_BASE}/users/${tmpUserId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
});

test.describe('Admin users action buttons', () => {
  test.beforeEach(async ({ page }) => {
    const { token } = await loginViaApi();
    await page.goto('/');
    await page.evaluate(({ k, t }) => localStorage.setItem(k, t), { k: 'alphix.v2:auth:token', t: token });
    await page.reload();
    await page.waitForTimeout(600);
    await page.goto('/admin/users');
    await page.getByPlaceholder(/Nom, email ou rôle/i).fill(TMP_EMAIL);
    await expect(page.locator('tbody tr', { hasText: TMP_EMAIL })).toBeVisible({ timeout: 15000 });
  });

  test('Désactiver puis Activer change le badge', async ({ page }) => {
    const row = page.locator('tbody tr', { hasText: TMP_EMAIL });
    await row.getByRole('button', { name: 'Désactiver' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Désactiver', exact: true }).click();
    await expect(row.getByText('Inactif')).toBeVisible({ timeout: 10000 });
    await row.getByRole('button', { name: 'Activer' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Activer', exact: true }).click();
    await expect(row.getByText('Actif')).toBeVisible({ timeout: 10000 });
  });

  test('Nommer puis Révoquer change le rôle', async ({ page }) => {
    const row = page.locator('tbody tr', { hasText: TMP_EMAIL });
    await row.getByRole('button', { name: 'Nommer' }).click();
    await expect(page.getByRole('dialog', { name: /Nommer délégué/ })).toBeVisible();
    const levelSelect = page.getByLabel('Classe (niveau) du délégué');
    const levelValue = await levelSelect.evaluate((el) => [...el.options].find((o) => o.value !== '').value);
    await levelSelect.selectOption(levelValue);
    await page.getByRole('dialog').getByRole('button', { name: 'Nommer délégué' }).click();
    await expect(row.getByText('Délégué')).toBeVisible({ timeout: 10000 });
    await row.getByRole('button', { name: 'Révoquer' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Révoquer', exact: true }).click();
    await expect(row.getByText('Étudiant')).toBeVisible({ timeout: 10000 });
  });
});

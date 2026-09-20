// @ts-check
import { test, expect } from '@playwright/test';
import { API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD, STORAGE_KEY, loginViaApi } from './helpers.js';

test.describe('Notifications — custom broadcast', () => {
  test('admin can send broadcast via UI and user receives in bell', async ({ page }) => {
    const admin = await loginViaApi(ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/');
    await page.evaluate(({ k, t }) => localStorage.setItem(k, t), { k: STORAGE_KEY, t: admin.token });
    await page.reload();
    await page.waitForResponse(r => r.url().includes('/api/v1/me') && r.status() === 200, { timeout: 8000 }).catch(()=>{});
    await page.waitForTimeout(500);

    // Navigate via client-side links to avoid direct-goto redirect (full reload at /admin goes to dashboard)
    await page.goto('/');
    await page.waitForTimeout(500);
    // Open sidebar if needed and click Administration
    const adminLink = page.locator('#app-sidebar').getByRole('link', { name: 'Administration' }).first();
    if (await adminLink.isVisible().catch(()=>false)) {
      await adminLink.click();
    } else {
      await page.goto('/admin');
    }
    await page.waitForTimeout(1500);
    // Now go to Paramètres via admin nav (client-side)
    const settingsLink = page.locator('.ax-admin-nav').getByRole('link', { name: 'Paramètres' }).first();
    if (await settingsLink.isVisible().catch(()=>false)) {
      await settingsLink.click();
    } else {
      await page.goto('/admin/settings');
    }
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await expect(page.getByText(/Diffuser un message/i).first()).toBeVisible({ timeout: 15000 });
    const titleInput = page.locator('#broadcast-title');
    await expect(titleInput).toBeVisible({ timeout: 8000 });
    const bodyInput = page.locator('#broadcast-body');
    await expect(bodyInput).toBeVisible();
    await expect(page.getByRole('button', { name: /Envoyer la diffusion/i })).toBeVisible();

    // Try empty submit → validation
    await page.getByRole('button', { name: /Envoyer la diffusion/i }).click();
    // Title required error should appear if title empty, but we will fill valid
    const uniq = `QA Broadcast ${Date.now()}`;
    const uniqBody = `Message QA ${Date.now()} — test broadcast depuis Playwright.`;
    await titleInput.fill(uniq);
    await bodyInput.fill(uniqBody);
    // Character counter visible
    await expect(page.getByText(/\/5000/)).toBeVisible();
    await page.getByRole('button', { name: /Envoyer la diffusion/i }).click();
    await expect(page.getByText(/Diffusion réussie|Diffusion envoyée/i)).toBeVisible({ timeout: 10000 });

    // Verify via API that unread contains our broadcast
    const unreadRes = await page.evaluate(async ({ base, token }) => {
      const r = await fetch(`${base}/notifications/me/unread`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      const j = await r.json().catch(()=>null);
      return { status: r.status, data: j };
    }, { base: API_BASE, token: admin.token });
    expect(unreadRes.status).toBe(200);
    const found = (unreadRes.data?.data || []).some((n) => n.title === uniq);
    expect(found, `broadcast ${uniq} should be in unread`).toBeTruthy();

    // Verify bell badge updated and dropdown shows notification
    const bellBtn = page.getByRole('button', { name: /Notifications/i }).first();
    await bellBtn.click();
    await page.waitForTimeout(800);
    // Dropdown dialog should be visible
    await expect(page.getByRole('dialog', { name: /Notifications/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(uniq).first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(uniqBody.slice(0,20)).first()).toBeVisible();
    const luButtons = page.getByRole('dialog').locator('button', { hasText: 'Lu' });
    await expect(luButtons.first()).toBeVisible({ timeout: 4000 });
    const beforeCount = await page.evaluate(async ({ base, token }) => {
      const r = await fetch(`${base}/notifications/me/unread`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      const j = await r.json();
      return (j.data || j).length || (Array.isArray(j) ? j.length : 0);
    }, { base: API_BASE, token: admin.token });
    await luButtons.first().click();
    await page.waitForTimeout(800);
    const afterRes = await page.evaluate(async ({ base, token }) => {
      const r = await fetch(`${base}/notifications/me/unread`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      return r.json();
    }, { base: API_BASE, token: admin.token });
    const afterCount = Array.isArray(afterRes?.data) ? afterRes.data.length : (Array.isArray(afterRes) ? afterRes.length : 0);
    expect(afterCount).toBeLessThan(beforeCount);

    // Dropdown should update (badge decreases)
    await page.waitForTimeout(500);
    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const stillVisible = await page.getByRole('dialog', { name: /Notifications/i }).isVisible().catch(()=>false);
    expect(stillVisible, 'dialog should close after Escape').toBeFalsy();
  });

  test('broadcast API validation and auth', async ({ request }) => {
    // No token → 401
    const noAuth = await request.post(`${API_BASE}/notifications/broadcast`, { data: { title: 'x', body: 'y' }, headers: { Accept: 'application/json' } });
    expect(noAuth.status()).toBe(401);

    // Admin token missing body → 422
    const admin = await loginViaApi();
    const missingBody = await request.post(`${API_BASE}/notifications/broadcast`, {
      data: { title: 'Only title' },
      headers: { Authorization: `Bearer ${admin.token}`, Accept: 'application/json' }
    });
    expect(missingBody.status()).toBe(422);

    // Missing title → 422
    const missingTitle = await request.post(`${API_BASE}/notifications/broadcast`, {
      data: { body: 'only body' },
      headers: { Authorization: `Bearer ${admin.token}`, Accept: 'application/json' }
    });
    expect(missingTitle.status()).toBe(422);

    // Valid broadcast → 201
    const uniq = `API QA ${Date.now()}`;
    const ok = await request.post(`${API_BASE}/notifications/broadcast`, {
      data: { title: uniq, body: 'body via API' },
      headers: { Authorization: `Bearer ${admin.token}`, Accept: 'application/json' }
    });
    expect(ok.status()).toBe(201);
    const j = await ok.json();
    expect(j.count).toBeGreaterThanOrEqual(1);
  });

  test('notification dropdown responsive at 320px', async ({ page }) => {
    const admin = await loginViaApi();
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/');
    await page.evaluate(({ k, t }) => localStorage.setItem(k, t), { k: STORAGE_KEY, t: admin.token });
    await page.reload();
    await page.waitForTimeout(800);
    // Header still visible
    await expect(page.locator('.ax-header')).toBeVisible();
    const bellBtn = page.getByRole('button', { name: /Notifications/i }).first();
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();
    const dialog = page.getByRole('dialog', { name: /Notifications/i });
    await expect(dialog).toBeVisible({ timeout: 4000 });
    // Dialog should fit within viewport (92vw)
    const box = await dialog.boundingBox();
    expect(box.width).toBeLessThanOrEqual(320);
    await page.keyboard.press('Escape');
  });

  test('no console errors on admin broadcast page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => {
      const t = String(e.message);
      if (t.includes('unique "key"')) return;
      errors.push(t);
    });
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const t = msg.text();
      if (t.includes('unique "key"') || t.includes('/health') || t.includes('[API]')) return;
      errors.push(t);
    });
    const admin = await loginViaApi();
    await page.goto('/');
    await page.evaluate(({ k, t }) => localStorage.setItem(k, t), { k: STORAGE_KEY, t: admin.token });
    await page.reload();
    await page.waitForResponse(r => r.url().includes('/api/v1/me') && r.status()===200, {timeout:8000}).catch(()=>{});
    await page.waitForTimeout(500);
    // Navigate via links to avoid direct-goto redirect
    await page.goto('/');
    await page.waitForTimeout(500);
    const adminLink = page.locator('#app-sidebar').getByRole('link', { name: 'Administration' }).first();
    if (await adminLink.isVisible().catch(()=>false)) await adminLink.click(); else await page.goto('/admin');
    await page.waitForTimeout(1500);
    const settingsLink = page.locator('.ax-admin-nav').getByRole('link', { name: 'Paramètres' }).first();
    if (await settingsLink.isVisible().catch(()=>false)) await settingsLink.click(); else await page.goto('/admin/settings');
    await page.waitForTimeout(800);
    expect(errors, `console/pageerror: ${errors.join(' | ')}`).toEqual([]);
  });
});

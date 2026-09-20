// @ts-check
/* Verification temporaire du guide d'accueil (onboarding 1re visite). */
import { test, expect } from '@playwright/test';

const WELCOME_KEY = 'alphix.v2:ui:welcome-seen';

test('guide de bienvenue : apparition, ouverture du menu, non-repetition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Contexte Playwright vierge : localStorage vide = vraie 1re visite.
  await page.goto('/');

  const card = page.locator('.ax-welcome__card');
  await expect(card).toBeVisible({ timeout: 12000 });
  console.log('ETAPE: carte visible');
  console.log('TITRE: ' + (await page.locator('.ax-welcome__title').innerText()));

  // Le bouton ☰ recoit le coach-mark.
  await expect(page.locator('.ax-header__menu-btn--hint')).toHaveCount(1);
  console.log('ETAPE: coach-mark ☰ actif');

  // Position : au-dessus de la barre de navigation (zone du pouce).
  const box = await card.boundingBox();
  const navBox = await page.locator('.ax-bottom-nav').boundingBox();
  console.log(`POSITION: card.bottom=${Math.round(box.y + box.height)} nav.top=${Math.round(navBox.y)}`);
  expect(box.y + box.height).toBeLessThanOrEqual(navBox.y + 2);

  // Invitation a se connecter pour un invite.
  await expect(card.getByRole('button', { name: /Se connecter/i })).toBeVisible();
  console.log('ETAPE: bouton Se connecter present');

  // CTA principal : ouvre reellement la barre laterale.
  await card.getByRole('button', { name: /Ouvrir le menu/i }).click();
  const sidebar = page.locator('#app-sidebar');
  await expect(sidebar).toBeVisible({ timeout: 5000 });
  await expect(sidebar).toHaveClass(/ax-sidebar--open/);
  console.log('ETAPE: sidebar ouverte via le guide');

  // Rechargement : le guide ne doit plus s'afficher (drapeau persiste).
  await page.reload();
  await page.waitForTimeout(2000);
  await expect(page.locator('.ax-welcome__card')).toHaveCount(0);
  console.log('DRAPEAU: ' + (await page.evaluate((k) => localStorage.getItem(k), WELCOME_KEY)));
  console.log('ETAPE: non-repetition OK');
  console.log('RESULTAT: OK');
});

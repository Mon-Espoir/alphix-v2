// @ts-check
/* eslint-disable no-unused-vars */
// TEMP — Reproduction : tiroir « Choisir ma classe » → département → BAC.
// Data-driven : le triplet teste est choisi dans les vraies donnees API avec
// au moins 1 cours attendu. Si l'UI n'affiche rien => bug prouve.
import { test, expect } from '@playwright/test';
import { apiFetch, normalizeList } from './helpers.js';

const rid = (c) => ({
  facultyId: String(c?.faculty_id ?? c?.department?.faculty_id ?? c?.department?.faculty?.id ?? ''),
  departmentId: String(c?.department_id ?? c?.department?.id ?? ''),
  levelId: String(c?.level_id ?? c?.level?.id ?? ''),
});
const depFaculty = (d) => String(d?.faculty_id ?? d?.faculty?.id ?? '');

// Fenetre < 640px : le tiroir mobile (ax-filters-mobile-header) est actif.
test.use({ viewport: { width: 600, height: 900 } });

test('classpicker: department + BAC shows the matching courses', async ({ page }) => {
  const [facs, deps, levels, courses] = await Promise.all([
    apiFetch('/faculties').then(normalizeList),
    apiFetch('/departments').then(normalizeList),
    apiFetch('/levels').then(normalizeList),
    apiFetch('/courses?per_page=2000').then(normalizeList),
  ]);
  console.log(`API: ${facs.length} facultes, ${deps.length} departements, ${levels.length} niveaux, ${courses.length} cours`);

  // Meilleur triplet (faculte, departement, niveau) par nombre de cours.
  let best = null;
  for (const d of deps) {
    const fid = depFaculty(d);
    if (!fid) continue;
    const dCourses = courses.filter((c) => rid(c).departmentId === String(d.id));
    for (const lv of levels) {
      const n = dCourses.filter((c) => rid(c).levelId === String(lv.id)).length;
      if (n > 0 && (!best || n > best.count)) {
        best = { faculty: facs.find((f) => String(f.id) === fid), department: d, level: lv, count: n };
      }
    }
  }
  if (!best) { console.log('AUCUN triplet avec cours — données insuffisantes'); return; }
  const fName = best.faculty?.name ?? '';
  const dName = best.department?.name ?? '';
  const lName = best.level?.name ?? '';
  console.log(`PISTE: faculte="${fName}" departement="${dName}" niveau="${lName}" (${best.level?.code ?? ''}) => ${best.count} cours attendus`);

  await page.goto('/documents');
  await page.waitForSelector('.ax-filters-class-btn', { timeout: 15000 });

  // 1. Ouvrir le tiroir
  await page.locator('.ax-filters-class-btn').click();
  const sheet = page.locator('.ax-sheet');
  await expect(sheet).toBeVisible();

  // 2. Etape 1 : etendre la faculte puis cliquer le departement (texte EXACT
  // du label — evite de confondre « Médecine » avec « Médecine Générale »).
  await sheet.locator('.ax-sheet__row').filter({ hasText: fName }).first().click();
  const subTexts = await sheet.locator('.ax-sheet__sublist .ax-sheet__row-label').allTextContents().catch(() => []);
  console.log(`SUBROWS: ${JSON.stringify(subTexts.map((s) => s.trim()))}`);
  // Selection deterministe : index de la ligne dont le label est exactement
  // le departement vise (evite « Médecine » vs « Médecine Générale »).
  const subIndex = subTexts.findIndex((s) => s.trim() === dName);
  if (subIndex < 0) throw new Error(`Departement "${dName}" introuvable dans ${JSON.stringify(subTexts)}`);
  await sheet.locator('.ax-sheet__row--sub').nth(subIndex).click();

  // 3. Etape 2 : cliquer le BAC
  const sheetTitle = await sheet.locator('.ax-sheet__title').textContent().catch(() => '(?!)');
  const rowTexts = await sheet.locator('.ax-sheet__row').allTextContents().catch(() => []);
  console.log(`ETAPE: titre="${(sheetTitle || '').trim()}" rows=${JSON.stringify(rowTexts.map((t) => t.trim().replace(/\s+/g, ' ').slice(0, 40)))}`);
  await sheet.locator('.ax-sheet__row', { hasText: lName }).first().click();
  await expect(sheet).toBeHidden({ timeout: 5000 });

  // 4. Observer le resultat reel
  await page.waitForTimeout(2500);
  const breadcrumb = await page.locator('.ax-breadcrumb').textContent().catch(() => '(absent)');
  const emptyVisible = await page.locator('.ax-empty-state').isVisible().catch(() => false);
  const emptyText = emptyVisible ? await page.locator('.ax-empty-state').textContent() : '';
  const cardCount = await page.locator('.ax-course-grid .ax-card, .ax-doc-grid .ax-card').count();
  console.log(`RESULT: breadcrumb="${(breadcrumb || '').trim()}" cards=${cardCount} emptyVisible=${emptyVisible} emptyText="${(emptyText || '').trim().slice(0, 140)}"`);
  console.log(`ATTENDU: ${best.count} cours pour ${fName} / ${dName} / ${lName}`);
  expect(cardCount).toBeGreaterThan(0);
});

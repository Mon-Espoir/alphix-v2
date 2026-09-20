// Shared helpers for ALPHIX V2 e2e — no hardcoded hierarchy, real API driven
export const API_BASE = 'http://localhost:8000/api/v1';
export const ADMIN_EMAIL = 'monirankunda@gmail.com';
export const ADMIN_PASSWORD = 'monespoir.443125';
export const STORAGE_KEY = 'alphix.v2:auth:token';

export async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}
export function normalizeList(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  return [];
}
export async function loginViaApi(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login failed ${res.status} ${JSON.stringify(body)}`);
  const token = body.token || body.data?.token || body.access_token;
  const user = body.user || body.data?.user || null;
  if (!token) throw new Error('no token in login response');
  return { token, user, body };
}
export async function injectAuth(page, token) {
  await page.addInitScript(({ key, token }) => {
    try { localStorage.setItem(key, token); } catch { /* ignore */ }
  }, { key: STORAGE_KEY, token });
}
export async function loginUI(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.waitForSelector('#login-email', { timeout: 15000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL(/\/dashboard|\//, { timeout: 15000 });
}

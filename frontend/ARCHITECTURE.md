# ARCHITECTURE — ALPHIX V2 Frontend

## Principes

- **Feature-complete, production-ready** — pas de redesign UI en Phase 11, uniquement readiness.
- **Contracts immuables** : backend, auth, stores, providers, Upload/Automation engines inchangés (fix bug réel seul).
- **Transport isolé** : `src/api/*` délègue à `src/services/httpService` → `src/api/client.js` (Axios). Jamais `fetch`, jamais second client.
- **Design system** : `ax-*` uniquement, mobile-first, `theme.css` tokens, `prefers-reduced-motion`.

## Flux

```
main.jsx -> App.jsx -> AppProviders (ErrorBoundary > AuthProvider > RouterProvider) -> router.jsx (lazy + Suspense)
Auth: useAuth() -> useAuthStore (Zustand) <-> storage.js (localStorage + MEMORY_STORE) <-> api/client interceptors (Bearer)
API: Feature -> *Api.js -> httpService -> apiClient (normalizeApiError -> ApiError)
```

## Routing (code-splitting)

- `src/app/router.jsx` : layouts eager (`GuestLayout`, `AppLayout`, `AdminLayout`, `ProtectedRoute`/`AdminRoute`), pages **lazy** (`React.lazy` + `lazyElement` helper avec `Suspense` → `LoadingScreen`). 30+ routes split : `vendor` / `admin` / `automation` / `upload` / `documents` via `vite.config.js` `manualChunks`.
- `routeConfig` exporté pour testabilité.

## State

- `authStore` : `user`/`token`/`status`/`isLoading`, `initializeAuth` (GET `/me`), `login`/`register`/`logout`, `clearAuth` sur 401 event.
- `uiStore` : `theme`, `isSidebarOpen` (`toggleSidebar`/`closeSidebar`) — ESC + focus trap dans `Sidebar.jsx`.
- `notificationStore` : `notify`/`dismiss`/`clearAll`, auto-dismiss timers nettoyés.

## Moteurs

- **UploadEngine** (`src/features/upload/uploadEngine.js`) : séquentiel 1 actif max, phases HASHING(40)→CHECKING(10)→TRANSFER(40)→REGISTRATION(10), SHA-256 chunked annulable, `findQueueHashCollision` + `UploadApi.findDuplicateByHash`, retry exponentiel, `AbortController` par item, `destroy()` cleanup. Intouché en Phase 11.
- **Automation** (`src/features/automation/*`) : `documentAutomation` (metadata extraction + suggestions), `driveAutomation` (health/sync retry), `indexAutomation` (TTL cache), `notificationAutomation`, `maintenanceAutomation`; hook `useAutomation` polling avec cleanup. Frontend-only.

## Sécurité

- **Routes** : `ProtectedRoute` (isAuthenticated), `AdminRoute` (`hasAdminAccess` tolère `role`/`roles[]`, écran `Accès refusé` explicite, pas de redirect silencieux).
- **Token** : `src/utils/storage.js` probe + fallback Map, `api/client` `Authorization: Bearer` via `AUTH_BEARER_PREFIX`, `skipAuth` flag, `withCredentials` selon `authMode`, 401 → `auth:unauthorized` event (pas de purge directe pour éviter cycle).
- **Erreurs** : `ApiError` typée (`API_ERROR_TYPES`), `toJSON` sans headers, `extractRequestInfo` sans token, `console.error` seulement en `isDev`.
- **XSS** : aucun `dangerouslySetInnerHTML`, `innerHTML` seulement en test diagnose, toutes valeurs échappées par React.
- **Headers** : `vite.config` preview/server `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.
- **Build** : `sourcemap: false`, `cssCodeSplit: true`.

## Accessibilité & Résilience

- Keyboard : Sidebar ESC + Tab trap, ConfirmModal Tab trap + focus first button + return focus, Header `aria-expanded`/`controls`, skip-link `ax-skip-link` (`#main-content`/`#admin-main`), BottomNav `aria-label`.
- Screen reader : `role="status"`/`alert`/`alertdialog`, `aria-modal`, `aria-live` (notifications), `aria-busy`.
- Reduced motion : `@media (prefers-reduced-motion: reduce)` (spinner 2.4s, no transform).
- Résilience : `hasLocalStorage` try/catch, `Promise.allSettled` pour références, `LoadingScreen`/`EmptyState`/`ErrorBoundary` partout, `AbortController` + `cancelled` flags, retry `syncWithRetry`.

## Monitoring

- `src/utils/monitor.js` : `observeLCP` (PerformanceObserver) + `countApiError` counters (Map mémoire, pas de PII).

## Config

- `src/config/env.js` : seule lecture `import.meta.env`, defaults, validation `SUPPORTED_AUTH_MODES`, `normalizeBaseUrl`.
- `src/config/api.js` : `apiConfig` figé (baseURL, timeout, headers, useBearer, withCredentials, isDev).

## Build

- `vite.config.js` : `chunkSizeWarningLimit: 350`, `manualChunks` function, security headers.
- `index.html` : `lang="fr"`, `meta description` + `theme-color`, title `ALPHIX V2`.

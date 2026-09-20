# ALPHIX V2 — Frontend

Plateforme documentaire universitaire du Burundi. React 19 + Vite 8 + Zustand + Axios + React Router 7 — mobile-first, `ax-*` design system.

## Stack

- **React 19** (Suspense + lazy routes, `createRoot` + StrictMode)
- **Vite 8** (code splitting, `manualChunks`: vendor / admin / automation / upload / documents)
- **React Router 7** (`createBrowserRouter`, `ProtectedRoute`/`AdminRoute`, `Suspense` + `LoadingScreen`)
- **Zustand 5** (`authStore`, `uiStore`, `notificationStore`)
- **Axios 1.19** (central `api/client.js` + `httpService`, `normalizeApiError` → `ApiError`)

## Scripts

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build (sourcemap off, cssCodeSplit, chunks)
npm run preview  # preview dist
npm test         # Vitest jsdom (135 tests)
npm run lint     # eslint flat (react-hooks + react-refresh)
```

## Environnement

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=ALPHIX V2
VITE_AUTH_MODE=token   # token | cookie
```

Voir `src/config/env.js` (seule source `import.meta.env`) et `.env.example`.

## Fonctionnalités

- **Auth** : login/register, Sanctum token, `auth:unauthorized` event, `ProtectedRoute`/`PublicRoute`
- **Documents** : CRUD, search (`/search`), preview (iframe + zoom), download tracking
- **Upload** : `UploadEngine` (SHA-256 chunked, duplicate detection, retry, `useUploadQueue`)
- **Stockage** : Google Drive fleet, health/priority, `AutomationApi`
- **Administration** : 10 pages `/admin/*` guardées `AdminRoute` (`hasAdminAccess`)
- **Automatisation** : plateforme frontend-only (metadata extraction, suggestions, drive health polling, index warming, notifications, statistics, maintenance)

## Structure

```
src/
  api/           # transport seul (httpService)
  app/router.jsx # lazy routes + Suspense
  components/    # ui / layout / documents / upload / admin / automation / feedback
  constants/     # routes, api, auth, upload, admin, automation
  features/      # uploadEngine, automation engines
  hooks/         # useAuth, useAutomation
  layouts/       # AppLayout, AdminLayout, GuestLayout
  pages/         # 30+ pages (toutes lazy)
  services/      # httpService
  store/         # Zustand
  styles/        # theme, layouts, components, pages, infrastructure
  utils/         # academic, upload, document, drive, storage, admin, automation, monitor
```

## Production

- `vite build` : `dist/` purgé de sourcemaps, headers `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- `ErrorBoundary` global, `observeLCP` hook (`src/utils/monitor.js`), `countApiError` counters
- LCP/CLI accessibles, `prefers-reduced-motion`, skip-link, focus trap (ConfirmModal/Sidebar)
- Voir `INSTALL.md`, `ARCHITECTURE.md`, `ADMIN_GUIDE.md`, `USER_GUIDE.md`, `CHANGELOG.md`

## Qualité

- Lint 0, build 229 modules, tests 135 (Vitest jsdom)
- Security : `ApiError.toJSON` sans headers, `hasLocalStorage` fallback, `normalizeApiError` typé
- A11y : keyboard, ARIA, `aria-expanded` header, sidebar inert focus, `LoadingScreen` `role="status"`

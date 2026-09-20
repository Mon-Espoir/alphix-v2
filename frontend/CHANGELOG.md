# CHANGELOG — ALPHIX V2 Frontend

Tous les changements notables par phase, production gating (lint/build/test).

## [11.0.0] — 2026-08-24 — Phase 11 Production Readiness

- **Performance** : `router.jsx` → `React.lazy` + `Suspense` + `LoadingScreen` pour 30+ pages, `vite.config.js` `manualChunks` (vendor/admin/automation/upload/documents), `chunkSizeWarningLimit 350`, `sourcemap false`, `cssCodeSplit true`; `StatCard`/`DocumentCard` `memo` pour éviter re-renders inutiles.
- **Security** : audit `dangerouslySetInnerHTML` (aucun), `localStorage` wrapper `hasLocalStorage` + `MEMORY_STORE`, `ApiError.toJSON` sans headers, `X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY` (vite headers), `sourcemap: false`, `index.html` `lang="fr"` + `meta theme-color`.
- **A11y** : skip-link `ax-skip-link` (`AppLayout`/`AdminLayout` `#main-content`/`#admin-main`), `vite.config` reduced-motion déjà; Header `aria-expanded` conservé.
- **Resilience** : `ErrorBoundary` global + `observeLCP`/`countApiError` (`src/utils/monitor.js`), `hasLocalStorage` try/catch, `Promise.allSettled` références, offline/network typés.
- **Docs** : `README.md`, `INSTALL.md`, `ARCHITECTURE.md`, `ADMIN_GUIDE.md`, `USER_GUIDE.md`, `CHANGELOG.md` (ce fichier).
- **Gates** : lint 0, build 229 modules, tests 135.

## [10.0.0] — Phase 10 Automation Platform

- `constants/automation.js`, `utils/automation.js` (metadata extraction, suggestions, confidence), 5 engines (`documentAutomation`, `driveAutomation`, `indexAutomation`, `notificationAutomation`, `maintenanceAutomation`), hook `useAutomation` (polling 30–300s, AbortController cleanup).
- Components `ConfirmMetadataDialog`, `AutomationStatusCard`, `DriveHealthIndicator`, `MaintenanceReportCard`, page `AutomationDashboardPage` (`/automation`), styles `pages.css` Automation, `Sidebar` entry.

## [9.0.0] — Phase 9 Administration

- `constants/admin.js`, `utils/admin.js` (15 KPIs, stats, filters, pagination), `AdminRoute`/`AdminLayout` + 10 pages `/admin/*`, `components/admin/*`, `Sidebar` admin link, build 214 modules, tests 120.

## [8.0.0] — Upload & Storage

- `constants/upload.js`, `utils/upload.js`/`drive.js`, `UploadEngine` (hash chunked, duplicate, retry, pause), `hooks/useUploadQueue` (`useSyncExternalStore`), 10 composants `upload/`, 4 pages `upload`/`storage`, `Sidebar` upload/storage, styles Phase 8. Tests 98.

## [7.x] — Documents / Search / Faculty etc.

- Document CRUD, search, preview, faculty/department/level/semester/course CRUD, auth, routing, `ax-*` design system.

## [1.0.0] — Initial

- Vite + React 19 + Zustand + Axios + React Router 7, `ErrorBoundary`, `AuthProvider`, `Sidebar`/`Header`/`BottomNav`/`Footer`, `theme.css`.

## Gate historique

- Lint : 0 error tout phases (fix `set-state-in-effect` via `eslint-disable` + handler resets)
- Build : 195 → 214 → 229 → 229 modules
- Tests : 98 → 120 → 135

# INSTALL — ALPHIX V2 Frontend

## Prérequis

- Node 20+ (recommandé 22), npm 10+
- Backend Laravel 13 accessible (`/api/v1` + Sanctum), CORS autorisé pour le front
- Variables env (voir `.env.example`)

## Installation

```bash
git clone <repo>
cd frontend
cp .env.example .env
# Editer .env :
# VITE_API_BASE_URL=http://localhost:8000/api/v1
# VITE_AUTH_MODE=token

npm install
npm run dev   # http://localhost:5173
```

## Vérification

```bash
npm run lint
npm run build  # dist/ + chunk report
npm test       # 135 tests
npm run preview # servir dist sur http://localhost:4173
```

## Variables d’environnement

| Var | Défaut | Notes |
|-----|--------|-------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Sans slash terminal (normalisé) |
| `VITE_AUTH_MODE` | `token` | `token` (Bearer) ou `cookie` (Sanctum) |
| `VITE_APP_NAME` | `ALPHIX V2` | Titre header |

Toute lecture passe par `src/config/env.js` (`readStringEnv`/`readIntEnv`), jamais direct `import.meta.env` ailleurs. Valeurs invalides → repli + `console.warn` en dev uniquement.

## Backend requis

- `composer install && php artisan migrate --seed`
- Endpoints : `/api/v1/register`, `/login`, `/logout`, `/me`, `faculties`, `departments`, `levels`, `semesters`, `courses`, `documents`, `users`, `google-drives`, `notifications`, `statistics`, `automation`, `upload`, `search`, `system-logs`
- Santé optionnelle : `GET /health` (affichée dans `/admin/settings`)

## Production

```bash
VITE_API_BASE_URL=https://api.alphix.bi/api/v1 npm run build
# Servir dist/ via Nginx/Apache statique + fallback SPA :
# try_files $uri /index.html;
# Headers : X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin (déjà dans vite preview)
```

Capacitor : `npx cap sync` après build, `VITE_AUTH_MODE=token` obligatoire (localStorage + SecureStorage fallback dans `src/utils/storage.js`).

## Dépannage

- `401` global → `auth:unauthorized` event → `AuthProvider` purge → redirect `/login` (voir `src/api/client.js`)
- `localStorage` bloqué (webview privée) → `MEMORY_STORE` Map (session) sans crash
- Chunk >350 kB warning → attendu, `manualChunks` déjà configuré (vendor/admin/automation)

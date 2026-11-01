# ALPHIX V2

Plateforme documentaire de l’Université du Burundi : centraliser, chercher, distribuer et conserver les ressources académiques (cours, examens, TP/TD) pour les étudiants, délégués et administrateurs.

Le frontend est une application React mobile-first (design system `ax-*`). Le backend est une API Laravel. Le stockage des gros PDF passe par Google Drive ; PostgreSQL ne conserve que les métadonnées.

## Production

| Service | URL |
| --- | --- |
| Frontend (site statique Render) | https://alphix-frontend.onrender.com |
| Backend API (Laravel) | https://alphix-backend.onrender.com |
| API v1 | https://alphix-backend.onrender.com/api/v1 |

Santé API : `GET https://alphix-backend.onrender.com/api/v1/maintenance/status`

## Architecture actuelle

```
[ Navigateur / APK Capacitor ]
            │
            ▼
[ alphix-frontend ]  Render Static  — CDN, jamais endormi
            │  HTTPS /api/v1
            ▼
[ alphix-backend  ]  Render Web (Docker, PHP-FPM)  — Frankfurt
            │  TLS, connexions PDO persistantes (pooler)
            ▼
[ PostgreSQL 17 ]    Supabase  — eu-west-1 (Frankfurt)
```

- **Frontend** : React 19, Vite 8, React Router 7, Zustand, Axios. Build figé vers l’API de production (`frontend/.env.production`).
- **Backend** : Laravel 13, PHP 8.3, Sanctum (Bearer). Blueprint : `backend/render.yaml`.
- **Base** : PostgreSQL 17.11 chez Supabase (région `eu-west-1`). Hors Blueprint Render.
- **Colocalisation** : le web service Render a été recréé à Frankfurt pour rester proche de la base (latence `/search` ~1,6 s).
- **Stockage fichiers** : Google Drive via rclone (conf hors Git).

Lots P0 (recherche / filtres / perf) validés : index SQL, filtres serveur (`buildDocSearchParams`), mémoïsation React. Suivi dans [`TODO.md`](TODO.md).

## Lancer en local

Prérequis : **PHP 8.3+**, **Composer**, **Node 20+** (npm 10+), **Git**.

### Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve          # http://localhost:8000
```

En local, `.env.example` pointe SQLite. Pour viser un Postgres, renseigner `DB_CONNECTION=pgsql` et les variables `DB_*`.

Tests API :

```bash
cd backend
php artisan test
```

### Frontend

```bash
cd frontend
cp .env.example .env
```

Dans `.env`, pour parler au backend local :

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_AUTH_MODE=token
```

```bash
npm install
npm run dev      # http://localhost:5173
```

Contrôles qualité (gates) :

```bash
npm run lint
npm run build
npm test
```

`npm run build` charge `frontend/.env.production` et **refuse** une release pointée vers localhost.

### Application Android

Après un `npm run build` dans `frontend/` :

```bash
npx cap sync
```

`VITE_AUTH_MODE=token` est obligatoire (Capacitor).

## Documentation complémentaire

- Frontend : [`frontend/README.md`](frontend/README.md), [`frontend/INSTALL.md`](frontend/INSTALL.md), [`frontend/ARCHITECTURE.md`](frontend/ARCHITECTURE.md), [`frontend/USER_GUIDE.md`](frontend/USER_GUIDE.md), [`frontend/ADMIN_GUIDE.md`](frontend/ADMIN_GUIDE.md)
- Déploiement Render : [`backend/render.yaml`](backend/render.yaml)
- Tâches : [`TODO.md`](TODO.md)

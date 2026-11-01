# ALPHIX V2 — Suivi des tâches

## Infrastructure (validée)

- [x] Base PostgreSQL migrée sur Supabase (17.11, `eu-west-1` / Frankfurt)
- [x] Backend Render recréé à Frankfurt (`srv-dbdpbtl9fdbs7386r6jg`)
- [x] Frontend statique Render (`srv-daskn6o473hc738oj3qg`) — https://alphix-frontend.onrender.com
- [x] API production — https://alphix-backend.onrender.com
- [x] Sauvegarde locale : `/home/irankunda/alphix-backup-2026-10-20T10-28Z.tar.gz`

## Lot P0 — Recherche, filtres, performance (terminé)

Audit appliqué dans le commit `c8acd0f` (`feat(search): filtres document 100% serveur, index SQL et memoisation`).

- [x] **P0-1** Index SQL — migration `2026_10_21_000001_add_search_performance_indexes.php`
- [x] **P0-2** Filtres serveur — `buildDocSearchParams` + `/search` (`tag_id`, `level_id`, `semester_id`, `doc_types[]`, dates SARGABLE)
- [x] **P0-3** Mémoïsation React — `useMemo` / `useCallback` dans `DocumentSearchPage.jsx` et `DocumentsListPage.jsx`

## Phase 12 — Production Release (en cours)

Objectif : Release Candidate, puis version 1.0. Pas de redesign ; valider ce qui est déjà en production.

### Release Candidate

- [ ] Geler le périmètre RC (pas de nouvelle feature hors correctif bloquant)
- [ ] Vérifier les URLs officielles (frontend + API + `/api/v1/maintenance/status`)
- [ ] Confirmer la config production (Frankfurt + Supabase, `frontend/.env.production`)
- [ ] Tag git RC (ex. `v1.0.0-rc.1`) une fois les gates verts

### QA finale

- [ ] Parcours étudiant : inscription / connexion, explorer, recherche, filtres, aperçu, téléchargement, favoris
- [ ] Parcours délégué / admin : upload, publication, utilisateurs, facultés / cours
- [ ] Régression mobile (viewport étroit + APK debug si disponible)
- [ ] États vides, erreurs réseau, cold start Render (spin-down 15 min)

### Vérification des builds

- [ ] Frontend : `npm run lint` && `npm run build` && `npm test` (dans `frontend/`)
- [ ] Backend : `php artisan test` (dans `backend/`)
- [ ] Build Android : `npm run build` puis `npx cap sync` (pointe bien l’API de production, pas localhost)
- [ ] Contrôle post-déploiement : le site et l’API répondent 200 après le dernier commit `master`

### Suite Phase 12 (après RC)

- [ ] Vérification de la sauvegarde (restauration à blanc hors production)
- [ ] Monitoring minimal (santé API, erreurs 5xx)
- [ ] Guides à jour (install, admin, déploiement) alignés sur les URLs officielles
- [ ] Version 1.0

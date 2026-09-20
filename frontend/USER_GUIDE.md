# USER GUIDE — ALPHIX V2

Bienvenue sur ALPHIX V2, plateforme documentaire universitaire.

## 1. Connexion

- `/` : **Explorer** → `/search`, **Connexion** → `/login`, **Créer un compte** → `/register`.
- `/login` : email + mot de passe → `useAuth.login` → redirect `/dashboard`. Erreurs 422 affichées champ par champ.
- `/register` : nom + email + mdp + confirmation → `register` → `/dashboard`.
- Header : logo → `/`, avatar, `Menu` (mobile) + `Notifications` (→ `/search`).

## 2. Navigation

- **Sidebar** (desktop fixe, mobile overlay) : Accueil, Recherche, Facultés, Téléversement, Stockage, Automatisation, Administration (si admin), Profil, Paramètres (`/admin/settings`). Mobile : X, backdrop click, ESC, Tab trap, focus return.
- **BottomNav** (mobile) : Accueil `/`, Recherche `/search`, Documents `/documents`, Profil `/dashboard`.
- **Admin secondary nav** (`/admin/*`) : Tableau de bord, Utilisateurs, Documents, Facultés, Départements, Cours, Stockage, Statistiques, Journaux, Paramètres — sticky, scroll horizontal.
- **Skip link** : Tab → “Aller au contenu principal” → `#main-content`/`#admin-main`.

## 3. Recherche `/search`

- Barre + filtres faculté/département/type/visibilité → `SearchApi.search` (`buildSearchParams`). Popular queries préchargées (index automation).

## 4. Documents `/documents`

- **Bibliothèque** : pagination serveur Laravel (`DocumentApi.list {page}`), `DocumentToolbar` (tri newest/oldest/alpha/downloads/views), `DocumentGrid`/`Table` toggle, `DocumentFilters` multi-facettes, skeletons + retry.
- **Détail** `/documents/:id` : `DocumentBreadcrumb` (faculté > dept > niveau > semestre > cours > titre), `DocumentMeta` (type/statut/visibilité/pages/taille/drive links), `DocumentTags`.
- **Aperçu** `/documents/:id/preview` : `DocumentViewer` (iframe `resolveFileUrl`, zoom ±0.25, plein écran, `prefers-reduced-motion`).
- **Créer/Editer** `/documents/create` + `/:id/edit` : `DocumentFormPage` validation 422, champs `title`/`description`/`doc_type`/`course_id` etc.

## 5. Facultés / Départements / Niveaux / Semestres / Cours

- Listes (`FacultiesListPage` etc.) : search, table `ax-table`, pagination, badges, actions Edit/Delete (`ConfirmModal`).
- Formulaires (`FacultyFormPage` etc.) : `name`/`code`/`description` + liaisons (department.faculty_id, course.department_id/semester_id), `onSubmit` → `*Api.create/update` → `notify.success` → redirect liste.

## 6. Téléversement `/upload`

- **Centre** : `UploadZone` drag & drop + picker (MIME `.pdf,.doc,.docx,.ppt,.pptx,.jpg,.png`, 20 Mo max), `GoogleDriveApi.getActiveByPriority` + `DriveSelector` (priorité + place dispo), `UploadToolbar` (pause/reprise/purge), `UploadQueue` séquentielle (hash SHA-256 chunked, `UploadApi.validateFile` multipart, `DocumentApi.create`).
- Doublon → `DuplicateDialog` (portail, focus trap, `replace`/`keep_both` (revision) /`cancel`) — contrainte `file_hash` UNIQUE.
- **Historique** `/upload/history` : filtres statut, retry/purge/batch delete, `ConfirmModal`.

## 7. Stockage `/storage` + `/storage/drives`

- **Dashboard** : `StorageStatistics` (daily volume series), `GoogleDriveCard` (health `healthy/warning/critical`, usage bar), `DriveSelector`, polling 30s.
- **Drives** : `DriveManagerPage` — CRUD drives (`GoogleDriveApi.patch {priority,is_default}` via `buildPrioritySwap`), sync (`AutomationApi.synchronizeDrive`), connectivité (`GoogleDriveApi.get` + latency).

## 8. Profil `/dashboard`

- Bonjour `user.name`, stats facultés/départements, activité récente (placeholder).

## 9. Automatisation `/automation`

- Tester un fichier → extraction métadonnées + suggestions, dialogue si confiance <65%. Monitoring drives (best drive, rebalance), reindex (Statistics/Search), notifications test, stats live, maintenance report (cleanup candidates + `verifyIntegrity`).

## 10. Aides

- **Accessibilité** : Tab, ESC, `aria-*`, skip-link, `prefers-reduced-motion`, focus-visible.
- **Offline** : `NETWORK_ERROR`/`TIMEOUT_ERROR` → `notify.error` sans stack, retry possible, `ErrorBoundary` repli.
- **Mobile** : BottomNav + Sidebar overlay, `env(safe-area-inset-bottom)`, `touch` handling UploadZone.

## Raccourcis

- `ESC` : ferme Sidebar / modal
- `Tab` / `Shift+Tab` : navigation focale trapée

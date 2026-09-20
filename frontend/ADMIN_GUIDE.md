# ADMIN GUIDE — ALPHIX V2

Accès `/admin/*` — protégé `AdminRoute` (`role` ∈ `admin`/`super_admin`/`superadmin`, sinon écran `Accès refusé`).

## Tableau de bord `/admin`

15 KPIs : total/active/online users, total/uploads today/downloads today, active faculties/departments, total courses, active drives, storage %, pending validations, failed uploads, server health (`healthy` par défaut), version `2.0.0`. Bars 7j, recent docs/users (tri `created_at`), quick actions → `users`/`documents`/`storage`/`logs`.

## Utilisateurs `/admin/users`

- Search (name/email/role), filtres `status` (all/active/inactive) + `role`, pagination 15, badge role (`ROLE_BADGE_VARIANT`), badge status (success/danger), `Dernière connexion`. Actions : **Profil** (modal) + **Activer/Désactiver** (`UserApi.patch {status}` + `notify.success`/`error`). ConfirmModal pour toggle. Empty state si 0.

## Documents `/admin/documents` (modération)

- Search (title/slug/description), filtres `status` (pending/approved/rejected/archived) + `visibility`, pagination 15. Actions : **Détails** (modal metadata + `metadata.versions`), **Approuver** (`status: approved`), **Rejeter** (`rejected`), **Archiver** (`archived`), **Public/Privé** (`visibility`). `DocumentApi.patch`, badge statut (`STATUS_VARIANT`).

## Facultés `/admin/faculties` & Départements `/admin/departments`

- CRUD complet (`list` → `create`/`update`/`patch {status}`/`delete`), stats `computeEntityStats` (total/active), pagination 10, modal form (name/code [+faculty_id]), ConfirmModal delete. `FacultyApi`/`DepartmentApi`.

## Cours `/admin/courses`

- CRUD (`CourseApi` — index exclu backend, donc fallback vide + message explicatif, agrégation par `departments`/`semesters` en display). Formulaire : name/code/department/semester, badges faculté via `departments.find`. Pagination 10.

## Stockage `/admin/storage`

- **Lecture seule admin**, pas d’upload engine mutation. `GoogleDriveApi.list`, agrégation `computeStorageStats`, bars usage, cartes drive (health `healthy/warning/critical`, prio, `is_default` badge, status, `upload_count`/`last_sync_at`, `type`/`email`), actions : **Synchroniser** (`AutomationApi.synchronizeDrive`, `notify`), **Tester connectivité** (`GoogleDriveApi.get`).

## Statistiques `/admin/statistics`

- 14j uploads (`buildDailyUploadSeries`), downloads/views totaux, storage (flotte), user growth cumulatif (`buildUserGrowthSeries`), par faculté/département (`groupDocumentsBy*`), top searches (`SearchApi.getPopularQueries`), missing docs heuristique (cours sans doc >30j).

## Journaux `/admin/logs`

- `httpService.get('/system-logs')` tolérant 404 → empty state explicite (“aucune donnée fabriquée”). Filtres niveau (`info`/`warning`/`error`/`security`) + search (message/module/action), pagination 15. Table `created_at`/`level`/`module`/`action`/`message`/`user`.

## Paramètres `/admin/settings`

- App info : nom `ALPHIX V2`, version `2.0.0`, env `import.meta.env.MODE`, base URL, santé (`GET /health` optionnel). Storage config (flotte lecture). Maintenance toggle (simulation locale, `notify.info`, pas d’endpoint). System info (UA, langue, TZ, date). Liens `logs`/`statistics`.

## Automatisation `/automation` (tous users, protégé)

- Document Processing : déposer un fichier → `processDocumentFile` (hash + duplicate + metadata + suggestions `faculty/department/course/semester/docType` + confiance) → `ConfirmMetadataDialog` si <65% ou duplicate/invalid.
- Drive Automation : best drive (`selectBestDrive`), rebalance >80%, `syncWithRetry` ×3, health snapshot (`DriveHealthIndicator`).
- Index : `maybeRecalculateStatistics`/`prefetchSearches` TTL 90s + `refreshCaches`.
- Notifications : `resolveTargetsForDocument` (admins + faculty/department + owner) + `notifyAdmins` tester.
- Statistics Engine : daily, by faculty/dept, storage, growth — live.
- Maintenance : `buildMaintenanceReport` (cleanup >7j failed/pending + `verifyIntegrity`), `MaintenanceReportCard`.

## Sécurité

- `AdminRoute` vérifie `isAuthenticated` puis `hasAdminAccess`; sinon redirect `/login` ou écran refus. Tous `/admin/*` sous `AdminLayout` (`Header` + `Sidebar` + secondary `ax-admin-nav`).
- `Sidebar` `isSidebarOpen` + ESC + Tab trap + `aria-expanded` header + skip-link.

## Dépannage

- `401` → `auth:unauthorized` → purge + redirect login (voir `api/client`).
- `500/403` → `ApiError` → `notify.error` sans stack, `ErrorBoundary` dernier rempart.

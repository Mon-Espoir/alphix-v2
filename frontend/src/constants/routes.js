/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Chemins de routage
 * ---------------------------------------------------------------------------
 * Source unique des URLs de l'application.
 */

/** Chemins des routes de l'application. */
export const ROUTE_PATHS = Object.freeze({
  /** Page d'accueil publique. */
  HOME: '/',
  /** Connexion (layout invite). */
  LOGIN: '/login',
  /** Inscription (layout invite). */
  REGISTER: '/register',
  /** Tableau de bord (layout applicatif, protege). */
  DASHBOARD: '/dashboard',
  /** Facultes (layout applicatif, protege). */
  FACULTIES: '/faculties',
  /** Departements (layout applicatif, protege). */
  DEPARTMENTS: '/departments',
  /** Niveaux (layout applicatif, protege). */
  LEVELS: '/levels',
  /** Semestres (layout applicatif, protege). */
  SEMESTERS: '/semesters',
  /** Cours (layout applicatif, protege). */
  COURSES: '/courses',
  /** Bibliotheque de documents (layout applicatif, protege). */
  DOCUMENTS: '/documents',
  /** Recherche globale de documents (publique, liee au module documents). */
  SEARCH: '/search',
  /** Centre de televersement (layout applicatif, protege). */
  UPLOAD: '/upload',
  /** Historique des televersements. */
  UPLOAD_HISTORY: '/upload/history',
  /** Tableau de bord stockage. */
  STORAGE: '/storage',
  /** Gestion des drives Google. */
  STORAGE_DRIVES: '/storage/drives',
  /** Administration - tableau de bord. */
  ADMIN: '/admin',
  /** Administration - utilisateurs. */
  ADMIN_USERS: '/admin/users',
  /** Administration - documents (modération). */
  ADMIN_DOCUMENTS: '/admin/documents',
  /** Administration - facultés. */
  ADMIN_FACULTIES: '/admin/faculties',
  /** Administration - départements. */
  ADMIN_DEPARTMENTS: '/admin/departments',
  /** Administration - cours. */
  ADMIN_COURSES: '/admin/courses',
  /** Administration - stockage (drives). */
  ADMIN_STORAGE: '/admin/storage',
  /** Administration - statistiques. */
  ADMIN_STATISTICS: '/admin/statistics',
  /** Administration - journaux système. */
  ADMIN_LOGS: '/admin/logs',
  /** Administration - paramètres. */
  ADMIN_SETTINGS: '/admin/settings',
})

/** Route de repli apres connexion. */
export const DEFAULT_AUTHENTICATED_REDIRECT = ROUTE_PATHS.DASHBOARD

/** Route de repli apres deconnexion. */
export const DEFAULT_UNAUTHENTICATED_REDIRECT = ROUTE_PATHS.LOGIN

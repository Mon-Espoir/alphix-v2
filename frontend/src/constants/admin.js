/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Constantes du module Administration
 * ---------------------------------------------------------------------------
 * Valeurs figées propres à l'espace administrateur.
 * Aucune logique métier : uniquement énumérations et configuration.
 */

/** Rôles disposant d'accès administrateur. */
export const ADMIN_ROLES = Object.freeze(['admin', 'super_admin', 'superadmin'])

/** Grades de criticité des logs système. */
export const LOG_LEVELS = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SECURITY: 'security',
})

/** États de modération des documents. */
export const DOC_MODERATION_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
})

/** Visibilités de document. */
export const DOC_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
  RESTRICTED: 'restricted',
})

/** Options de filtre pour l'administration utilisateurs. */
export const USER_STATUS_FILTER = Object.freeze({
  ALL: 'all',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
})

/** Pagination par défaut pour les listes admin. */
export const ADMIN_PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 15,
  PER_PAGE_OPTIONS: [10, 15, 25, 50],
})

/** Libellés accessibles pour les niveaux de log (a11y). */
export const LOG_LEVEL_LABELS = Object.freeze({
  info: 'Information',
  warning: 'Avertissement',
  error: 'Erreur',
  security: 'Sécurité',
})

/** Variantes Badge associées aux niveaux de log. */
export const LOG_LEVEL_BADGE = Object.freeze({
  info: 'default',
  warning: 'warning',
  error: 'danger',
  security: 'primary',
})

/** Libellés des rôles utilisateur (affichage). */
export const ROLE_LABELS = Object.freeze({
  admin: 'Administrateur',
  super_admin: 'Super admin',
  superadmin: 'Super admin',
  moderator: 'Modérateur',
  teacher: 'Enseignant',
  student: 'Étudiant',
  user: 'Utilisateur',
})

/** Variantes Badge par rôle. */
export const ROLE_BADGE_VARIANT = Object.freeze({
  admin: 'danger',
  super_admin: 'danger',
  superadmin: 'danger',
  moderator: 'warning',
  teacher: 'primary',
  student: 'default',
  user: 'default',
})

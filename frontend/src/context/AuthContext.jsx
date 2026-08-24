/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Contexte d'authentification
 * ---------------------------------------------------------------------------
 * Déclaration isolée du contexte (séparée du Provider pour respecter la
 * règle `react-refresh/only-export-components` et la clarté d'architecture).
 *
 * Valeur fournie par <AuthProvider> :
 *   { user, status, loading, isAuthenticated, login, logout, refreshUser }
 */

import { createContext } from 'react'

/** Contexte React portant l'API d'authentification. */
export const AuthContext = createContext(null)

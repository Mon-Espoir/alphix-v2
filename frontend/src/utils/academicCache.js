/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Cache mémoire des référentiels académiques
 * ---------------------------------------------------------------------------
 * Source de vérité : API Laravel (SQLite alimentée par les JSON académiques).
 * Les listes de référence (facultés, départements, niveaux, semestres, cours)
 * changent rarement : elles sont chargées UNE fois par session et gardées en
 * mémoire pour éviter les appels API inutiles à chaque navigation.
 */

import { normalizeApiList } from './academic'

/** @type {Map<string, Promise<Array<object>>>} */
const cache = new Map()

/**
 * Charge une liste de référence (une seule requête par clé et par session).
 * @param {string} key - Clé de cache (ex. 'faculties').
 * @param {() => Promise<unknown>} loader - Appel API à exécuter si absent.
 * @returns {Promise<Array<object>>} Liste normalisée (jamais rejetée : [] en cas d'erreur).
 */
export function cachedAcademicList(key, loader) {
  if (!cache.has(key)) {
    cache.set(
      key,
      loader()
        .then((response) => normalizeApiList(response))
        .catch(() => []),
    )
  }
  return cache.get(key)
}

/**
 * Invalide le cache (après une mutation admin par exemple).
 * @param {string} [key] - Clé précise, ou toutes les clés si omise.
 * @returns {void}
 */
export function clearAcademicCache(key) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

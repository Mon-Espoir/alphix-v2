/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Bus d'evenements documentaires (global, zero dependance)
 * ---------------------------------------------------------------------------
 * Un document publie depuis n'importe quelle page (ex. Centre de televersement)
 * doit etre visible immediatement ailleurs (listes, recherche, tableau de bord)
 * SANS rechargement complet. Ce bus diffuse un signal leger que les pages
 * ecoutent pour rafraichir leur propre etat React.
 */

const listeners = new Set()

/**
 * Emet un signal de changement documentaire.
 * @param {{type?: string, document?: object|null}} [payload] - Informations optionnelles.
 * @returns {void}
 */
export function emitDocumentPublished(payload = {}) {
  const event = { type: 'document.published', ...payload }
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // Un consommateur defectueux ne doit jamais casser l'emetteur.
    }
  }
}

/**
 * S'abonne aux signaux documentaires.
 * @param {(event: object) => void} listener - Callback recevant l'evenement.
 * @returns {() => void} Fonction de desabonnement.
 */
export function onDocumentPublished(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

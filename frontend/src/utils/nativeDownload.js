/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Téléchargement natif (Capacitor) avec repli web
 * ---------------------------------------------------------------------------
 * Sur appareil (android/ios via Capacitor) : le fichier est téléchargé
 * nativement dans le stockage du téléphone (Documents/ALPHIX) puis ouvert
 * dans le visualiseur système. Sur navigateur : repli window.open.
 * Aucune dépendance statique : imports dynamiques, jamais de crash web.
 */

/**
 * Vrai si l'app tourne dans le conteneur natif Capacitor.
 * @returns {boolean}
 */
export function isNativePlatform() {
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform) {
      return window.Capacitor.isNativePlatform() === true
    }
  } catch { /* repli web */ }
  return false
}

/**
 * Nom de fichier sûr pour le stockage Android (sans traversal, 120 car. max).
 * @param {string} raw - Nom brut (original_name, titre...).
 * @param {string} [fallback] - Nom de repli.
 * @returns {string}
 */
export function safeFileName(raw, fallback = 'document-alphix') {
  const base = String(raw || fallback).split('/').pop().split('\\').pop().trim()
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[<>:"|?*\u0000-\u001F]/g, '_').replace(/\s+/g, ' ').trim()
  const name = clean.replace(/^\.+/, '') || fallback
  if (name.length <= 120) return name
  const dot = name.lastIndexOf('.')
  if (dot > 0 && name.length - dot <= 12) {
    return `${name.slice(0, 120 - (name.length - dot))}${name.slice(dot)}`
  }
  return name.slice(0, 120)
}

/**
 * Télécharge un fichier vers le stockage du téléphone (natif uniquement).
 * @param {string} url - URL absolue du fichier (API /file?download=1 de préférence).
 * @param {string} fileName - Nom sous ALPHIX/ dans Documents.
 * @returns {Promise<{path: string, uri: string}>}
 */
export async function downloadNative(url, fileName) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const safe = safeFileName(fileName)
  const path = `ALPHIX/${safe}`

  // Voie 1 : téléchargement natif (sans passer par la mémoire JS).
  if (typeof Filesystem.downloadFile === 'function') {
    const res = await Filesystem.downloadFile({
      url,
      path,
      directory: Directory.Documents,
    })
    return { path, uri: res?.path ?? res?.uri ?? path }
  }

  // Voie 2 (repli) : blob -> base64 -> writeFile.
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Téléchargement impossible (HTTP ${response.status}).`)
  const blob = await response.blob()
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.readAsDataURL(blob)
  })
  const written = await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  })
  return { path, uri: written?.uri ?? path }
}

/**
 * Ouvre un fichier local/URL dans le visualiseur système (natif uniquement).
 * @param {string} uri - URI locale ou URL https.
 * @returns {Promise<void>}
 */
export async function openNative(uri) {
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url: uri })
}

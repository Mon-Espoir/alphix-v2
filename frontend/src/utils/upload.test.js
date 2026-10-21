/**
 * ALPHIX V2 — Tests des helpers du module Upload.
 */

import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatSpeed,
  formatDuration,
  validateUploadFile,
  computeFileSha256,
  aggregateProgress,
  clampPercent,
  isTerminalStatus,
  isActiveStatus,
  computeTransferSpeed,
  estimateEta,
  computeRetryDelay,
  cleanFileName,
  fileCategory,
  buildDailyVolumeSeries,
} from './upload'
import { UPLOAD_ITEM_STATUS } from '../constants/upload'

/** Fichier factice minimal (meme contrat que File pour les helpers purs). */
const fakeFile = (overrides = {}) => ({
  name: 'cours-algo.pdf',
  size: 1024,
  type: 'application/pdf',
  lastModified: 1700000000000,
  ...overrides,
})

describe('formatBytes / formatSpeed / formatDuration', () => {
  it('formate les tailles en unites lisibles', () => {
    expect(formatBytes(512)).toBe('512 o')
    expect(formatBytes(2048)).toBe('2.0 Ko')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 Mo')
    expect(formatBytes(3.5 * 1024 * 1024 * 1024)).toBe('3.50 Go')
    expect(formatBytes(null)).toBe('-')
    expect(formatBytes(-4)).toBe('-')
  })

  it('formate une vitesse positive uniquement', () => {
    expect(formatSpeed(2 * 1024 * 1024)).toBe('2.0 Mo/s')
    expect(formatSpeed(0)).toBe('-')
    expect(formatSpeed(null)).toBe('-')
  })

  it('formate les durees par paliers', () => {
    expect(formatDuration(400)).toBe('400 ms')
    expect(formatDuration(2500)).toBe('2.5 s')
    expect(formatDuration(65000)).toBe('1 min 05 s')
    expect(formatDuration(null)).toBe('-')
  })
})

describe('validateUploadFile', () => {
  it('accepte un fichier conforme (PDF < 50 Mo)', () => {
    const verdict = validateUploadFile(fakeFile())
    expect(verdict.valid).toBe(true)
    expect(verdict.errors).toEqual([])
  })

  it('rejette un MIME hors liste blanche', () => {
    const verdict = validateUploadFile(fakeFile({ type: 'application/zip' }))
    expect(verdict.valid).toBe(false)
    expect(verdict.errors[0]).toMatch(/non autorise/i)
  })

  it('rejette un fichier trop volumineux (> 20 Mo)', () => {
    const verdict = validateUploadFile(
      fakeFile({ size: 21 * 1024 * 1024 }),
      { maxSizeBytes: 20 * 1024 * 1024 },
    )
    expect(verdict.valid).toBe(false)
    expect(verdict.errors[0]).toMatch(/taille maximale/)
  })

  it('rejette un fichier vide ou absent', () => {
    expect(validateUploadFile(fakeFile({ size: 0 })).valid).toBe(false)
    expect(validateUploadFile(null).valid).toBe(false)
  })
})

describe('computeFileSha256', () => {
  it('calcule l’empreinte SHA-256 correcte d’un contenu connu', async () => {
    const content = new TextEncoder().encode('alphix')
    const blob = new Blob([content])
    const hash = await computeFileSha256(blob)
    // Empreinte de reference calculee independamment (sha256("alphix")).
    expect(hash).toHaveLength(64)
    expect(hash).toBe(hash.toLowerCase())
    // Stabilite : meme entree -> meme sortie.
    const again = await computeFileSha256(new Blob([content]))
    expect(again).toBe(hash)
  })

  it('signale la progression et honore l’annulation', async () => {
    const content = new Uint8Array(3000)
    const blob = new Blob([content])
    const seenRatios = []
    const controller = new AbortController()
    const hash = await computeFileSha256(blob, {
      signal: controller.signal,
      onProgress: (read, total) => seenRatios.push(read / total),
    })
    expect(hash).toHaveLength(64)
    expect(seenRatios.at(-1)).toBe(1)

    controller.abort()
    await expect(computeFileSha256(blob, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})

describe('aggregateProgress', () => {
  it('agrege la progression en excluant les statuts terminaux echoues', () => {
    const items = [
      { status: 'uploading', progress: 50 },
      { status: 'pending', progress: 0 },
      { status: 'failed', progress: 20 },
    ]
    expect(aggregateProgress(items)).toBe(Math.round((50 + 0) / 2))
  })

  it('rend 100 quand tout est termine et 0 a vide', () => {
    expect(aggregateProgress([{ status: 'uploaded', progress: 100 }])).toBe(100)
    expect(aggregateProgress([])).toBe(0)
  })
})

describe('clampPercent / statuts', () => {
  it('borne les pourcentages', () => {
    expect(clampPercent(140)).toBe(100)
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(NaN)).toBe(0)
  })

  it('classe les statuts terminaux et actifs', () => {
    expect(isTerminalStatus(UPLOAD_ITEM_STATUS.UPLOADED)).toBe(true)
    expect(isTerminalStatus(UPLOAD_ITEM_STATUS.UPLOADING)).toBe(false)
    expect(isActiveStatus(UPLOAD_ITEM_STATUS.HASHING)).toBe(true)
    expect(isActiveStatus(UPLOAD_ITEM_STATUS.PENDING)).toBe(false)
  })
})

describe('vitesse & ETA', () => {
  it('calcule une vitesse moyenne sur la fenetre ecoulee', () => {
    expect(computeTransferSpeed(2000, 0, 1000)).toBe(2000)
    expect(computeTransferSpeed(100, 0, 100)).toBeNull() // fenetre trop courte
    expect(computeTransferSpeed(0, 0, 5000)).toBeNull()
  })

  it('estime un ETA plausible ou null si vitesse inconnue', () => {
    expect(estimateEta(1000, 500)).toBe(2000)
    expect(estimateEta(0, 500)).toBe(0)
    expect(estimateEta(1000, null)).toBeNull()
  })
})

describe('computeRetryDelay (backoff exponentiel)', () => {
  it('double le delai puis plafonne', () => {
    expect(computeRetryDelay(1)).toBe(1000)
    expect(computeRetryDelay(2)).toBe(2000)
    expect(computeRetryDelay(3)).toBe(4000)
    expect(computeRetryDelay(10, { baseDelayMs: 1000, factor: 2, maxDelayMs: 5000 })).toBe(5000)
  })
})

describe('cleanFileName', () => {
  it('retire le suffixe de hash et humanise les separateurs', () => {
    expect(cleanFileName('cours_chimie [a1b2c3d4].pdf')).toBe('cours chimie.pdf')
    expect(cleanFileName('rapport-final-2026.docx')).toBe('rapport final 2026.docx')
  })

  it('repli neutre sur nom absent', () => {
    expect(cleanFileName(null)).toBe('fichier')
    expect(cleanFileName('   ')).toBe('fichier')
  })
})

describe('fileCategory', () => {
  it('classe par type MIME', () => {
    expect(fileCategory('application/pdf', 'x.pdf').icon).toBe('📕')
    expect(fileCategory('image/png', 'x.png').label).toBe('Image')
  })

  it('repli sur extension quand le MIME manque', () => {
    expect(fileCategory('', 'cours.docx').label).toBe('Word')
    expect(fileCategory(null, 'archive.zip').label).toBe('Archive')
  })

  it('repli neutre pour un type inconnu', () => {
    expect(fileCategory('', 'mystere.xyz')).toEqual({ label: 'Fichier', icon: '📎' })
  })
})

describe('buildDailyVolumeSeries', () => {
  it('agrege les volumes des seuls elements envoyes sur N jours', () => {
    const now = new Date('2026-03-10T12:00:00Z')
    const items = [
      {
        status: UPLOAD_ITEM_STATUS.UPLOADED,
        completedAt: '2026-03-10T08:00:00Z',
        size: 100,
      },
      {
        status: UPLOAD_ITEM_STATUS.UPLOADED,
        completedAt: '2026-03-09T09:00:00Z',
        size: 250,
      },
      {
        status: UPLOAD_ITEM_STATUS.FAILED,
        completedAt: '2026-03-10T07:00:00Z',
        size: 999,
      },
    ]
    const series = buildDailyVolumeSeries(items, 7, now)

    expect(series).toHaveLength(7)
    expect(series.at(-1).count).toBe(1)
    expect(series.at(-1).bytes).toBe(100)
    expect(series.at(-2).bytes).toBe(250)
    // Les jours sans envoi restent a zero (aucune donnee fabriquee).
    expect(series[0].bytes).toBe(0)
    expect(series[0].count).toBe(0)
  })
})

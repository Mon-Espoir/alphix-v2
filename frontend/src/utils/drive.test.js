/**
 * ALPHIX V2 — Tests des helpers Google Drive & Stockage.
 */

import { describe, expect, it } from 'vitest'
import {
  sortDrivesByPriority,
  computeUsageRatio,
  assessDriveHealth,
  driveHealthBadgeVariant,
  driveHealthLabel,
  driveTypeLabel,
  canAcceptUpload,
  selectTargetDrive,
  aggregateStorage,
  buildPrioritySwap,
} from './drive'

const drive = (overrides = {}) => ({
  id: 1,
  name: 'Drive A',
  type: 'shared_drive',
  storage_limit: 1000,
  used_storage: 500,
  available_storage: 500,
  priority: 1,
  health_status: 'healthy',
  is_default: false,
  status: true,
  ...overrides,
})

describe('sortDrivesByPriority', () => {
  it('trie par priorite croissante puis nom (ordre stable)', () => {
    const ordered = sortDrivesByPriority([
      drive({ id: 3, name: 'Zeta', priority: 2 }),
      drive({ id: 2, name: 'Beta', priority: 1 }),
      drive({ id: 1, name: 'Alpha', priority: 2 }),
      drive({ id: 4, name: 'Sans priorite', priority: undefined }),
    ])
    expect(ordered.map((d) => d.id)).toEqual([2, 1, 3, 4])
  })

  it('ne mute pas la source et tolere les entrees nulles', () => {
    const source = [drive({ priority: 5 }), drive({ priority: 1 })]
    const copy = [...source]
    sortDrivesByPriority(source)
    expect(source).toEqual(copy)
    expect(sortDrivesByPriority(null)).toEqual([])
  })
})

describe('computeUsageRatio & assessDriveHealth', () => {
  it('calcule le ratio et degrade la sante selon les seuils', () => {
    expect(computeUsageRatio(drive())).toBe(0.5)
    expect(computeUsageRatio(drive({ storage_limit: null }))).toBeNull()

    expect(assessDriveHealth(drive())).toBe('healthy')
    expect(assessDriveHealth(drive({ used_storage: 850 }))).toBe('warning')
    expect(assessDriveHealth(drive({ used_storage: 960 }))).toBe('critical')
    expect(assessDriveHealth(drive({ health_status: 'warning' }))).toBe('warning')
  })

  it('la saturation locale prime sur le statut serveur', () => {
    expect(
      assessDriveHealth(drive({ used_storage: 980, health_status: 'healthy' })),
    ).toBe('critical')
  })
})

describe('libelles de sante / type', () => {
  it('mappe sante vers badge + libelle', () => {
    expect(driveHealthBadgeVariant('critical')).toBe('danger')
    expect(driveHealthBadgeVariant('warning')).toBe('warning')
    expect(driveHealthBadgeVariant('healthy')).toBe('success')
    expect(driveHealthLabel('warning')).toBe('Attention')
  })

  it('mappe les types de drive', () => {
    expect(driveTypeLabel('personal')).toBe('Personnel')
    expect(driveTypeLabel('shared_drive')).toBe('Drive partage')
    expect(driveTypeLabel('service_account')).toBe('Compte de service')
    expect(driveTypeLabel('inconnu')).toBe('inconnu')
  })
})

describe('canAcceptUpload', () => {
  it('refuse un drive inactif ou critique', () => {
    expect(canAcceptUpload(drive({ status: false }))).toBe(false)
    expect(canAcceptUpload(drive({ health_status: 'critical' }))).toBe(false)
    expect(canAcceptUpload(null)).toBe(false)
  })

  it('accepte un drive actif avec espace suffisant pour le fichier', () => {
    expect(canAcceptUpload(drive(), { requiredBytes: 400 })).toBe(true)
    expect(canAcceptUpload(drive(), { requiredBytes: 600 })).toBe(false)
  })
})

describe('selectTargetDrive (handler de selection)', () => {
  it('choisit le premier drive prioritaire capable d’accueillir le fichier', () => {
    const drives = [
      drive({ id: 10, priority: 1, available_storage: 100 }),
      drive({ id: 20, priority: 2, available_storage: 900 }),
      drive({ id: 30, priority: 3, available_storage: 900 }),
    ]
    expect(selectTargetDrive(drives, { requiredBytes: 200 })?.id).toBe(20)
    expect(selectTargetDrive(drives, { requiredBytes: 50 })?.id).toBe(10)
  })

  it('repli explicite sur le drive par defaut, sinon null', () => {
    const drives = [
      drive({ id: 10, priority: 1, available_storage: 0, is_default: true }),
    ]
    expect(selectTargetDrive(drives, { requiredBytes: 50 })?.id).toBe(10)
    expect(selectTargetDrive([], { requiredBytes: 1 })).toBeNull()
  })

  it('ignore les drives desactives meme prioritaires', () => {
    const drives = [
      drive({ id: 10, priority: 1, status: false }),
      drive({ id: 20, priority: 2 }),
    ]
    expect(selectTargetDrive(drives)?.id).toBe(20)
  })
})

describe('aggregateStorage', () => {
  it('additionne quotas, usage et disponible ; signale l’absence de quotas', () => {
    const totals = aggregateStorage([
      drive(),
      drive({ id: 2, storage_limit: 3000, used_storage: 250, available_storage: 2750 }),
      drive({ id: 3, storage_limit: null, used_storage: 0, available_storage: 0 }),
    ])
    expect(totals).toEqual({
      totalLimit: 4000,
      totalUsed: 750,
      totalAvailable: 3250,
      hasCapacityData: true,
    })

    expect(aggregateStorage([{ storage_limit: null }]).totalLimit).toBeNull()
    expect(aggregateStorage([]).hasCapacityData).toBe(false)
  })
})

describe('buildPrioritySwap (affectation de priorite)', () => {
  it('genere l’echange de priorites vers le haut et le bas', () => {
    const drives = [
      drive({ id: 1, priority: 1 }),
      drive({ id: 2, priority: 2 }),
      drive({ id: 3, priority: 3 }),
    ]
    expect(buildPrioritySwap(drives, 2, -1)).toEqual([
      { id: 2, priority: 1 },
      { id: 1, priority: 2 },
    ])
    expect(buildPrioritySwap(drives, 2, 1)).toEqual([
      { id: 2, priority: 3 },
      { id: 3, priority: 2 },
    ])
  })

  it('retourne null aux bornes ou sur un id inconnu', () => {
    const drives = [drive({ id: 1, priority: 1 }), drive({ id: 2, priority: 2 })]
    expect(buildPrioritySwap(drives, 1, -1)).toBeNull()
    expect(buildPrioritySwap(drives, 2, 1)).toBeNull()
    expect(buildPrioritySwap(drives, 99, -1)).toBeNull()
  })
})

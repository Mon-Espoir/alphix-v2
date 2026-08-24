/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Tests des helpers academiques partages
 * ---------------------------------------------------------------------------
 * Couvre la normalisation des reponses API et les accesseurs defensifs.
 */

import { describe, expect, it } from 'vitest'
import {
  normalizeApiList,
  normalizeApiPagination,
  toSelectOptions,
  relationName,
  countOf,
  isActiveStatus,
  statusLabel,
  slugify,
} from './academic'

describe('normalizeApiList', () => {
  it('retourne le tableau brut tel quel', () => {
    const list = [{ id: 1 }, { id: 2 }]
    expect(normalizeApiList(list)).toBe(list)
  })

  it('deplie une reponse paginee Laravel { data }', () => {
    const response = { data: [{ id: 1 }], total: 1 }
    expect(normalizeApiList(response)).toEqual([{ id: 1 }])
  })

  it('retourne un tableau vide pour une reponse sans donnees', () => {
    expect(normalizeApiList(null)).toEqual([])
    expect(normalizeApiList({})).toEqual([])
    expect(normalizeApiList('x')).toEqual([])
  })
})

describe('normalizeApiPagination', () => {
  it('extrait les metas Laravel paginees', () => {
    const pagination = normalizeApiPagination({
      data: [],
      current_page: 2,
      last_page: 5,
      total: 120,
      per_page: 15,
    })
    expect(pagination).toEqual({ currentPage: 2, lastPage: 5, total: 120, perPage: 15 })
  })

  it('retourne null hors reponse paginee', () => {
    expect(normalizeApiPagination([1, 2, 3])).toBeNull()
    expect(normalizeApiPagination(null)).toBeNull()
  })
})

describe('toSelectOptions', () => {
  it('transforme des entites en options utilisables', () => {
    const options = toSelectOptions([{ id: 3, name: 'Informatique' }, { id: 7, name: 'Chimie' }])
    expect(options).toEqual([
      { value: 3, label: 'Informatique' },
      { value: 7, label: 'Chimie' },
    ])
  })

  it('ignore les entrees sans valeur et retourne [] sans tableau', () => {
    expect(toSelectOptions(null)).toEqual([])
    expect(toSelectOptions([{ name: 'x' }])).toEqual([])
  })
})

describe('relationName', () => {
  it('resout le nom d une relation imbriquee', () => {
    expect(relationName({ faculty: { name: 'Sciences' } }, 'faculty')).toBe('Sciences')
  })

  it('renvoie une chaine vide si la relation est absente', () => {
    expect(relationName({}, 'faculty')).toBe('')
    expect(relationName(null, 'faculty')).toBe('')
  })
})

describe('countOf', () => {
  it('priorite au compteur explicite puis a la relation tableau', () => {
    expect(countOf({ levels_count: 4, levels: [1, 2] }, { countKey: 'levels_count', arrayKey: 'levels' })).toBe(4)
    expect(countOf({ levels: [1, 2] }, { countKey: 'levels_count', arrayKey: 'levels' })).toBe(2)
  })

  it('retourne null sans donnee exploitable', () => {
    expect(countOf({}, { countKey: 'levels_count', arrayKey: 'levels' })).toBeNull()
    expect(countOf(null, { countKey: 'levels_count' })).toBeNull()
  })
})

describe('statut', () => {
  it('juge actif les valeurs vrai, 1 et absentes', () => {
    expect(isActiveStatus(true)).toBe(true)
    expect(isActiveStatus(1)).toBe(true)
    expect(isActiveStatus(undefined)).toBe(true)
    expect(isActiveStatus(0)).toBe(false)
    expect(isActiveStatus(false)).toBe(false)
  })

  it('formate le libelle Actif / Inactif', () => {
    expect(statusLabel(1)).toBe('Actif')
    expect(statusLabel(0)).toBe('Inactif')
  })
})

describe('slugify', () => {
  it('normalise un texte en slug URL', () => {
    expect(slugify('Chimie Générale')).toBe('chimie-generale')
    expect(slugify('  INF  ')).toBe('inf')
    expect(slugify('')).toBe('')
  })
})
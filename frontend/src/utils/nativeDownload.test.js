/**
 * ALPHIX V2 — Tests du téléchargement natif (Capacitor) + repli web.
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import { isNativePlatform, safeFileName } from './nativeDownload'

describe('isNativePlatform', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retourne false sur navigateur (sans Capacitor)', () => {
    vi.stubGlobal('window', {})
    expect(isNativePlatform()).toBe(false)
  })

  it('retourne true quand Capacitor natif est présent', () => {
    vi.stubGlobal('window', { Capacitor: { isNativePlatform: () => true } })
    expect(isNativePlatform()).toBe(true)
  })

  it('ne crashe jamais (repli web)', () => {
    vi.stubGlobal('window', { Capacitor: { isNativePlatform: () => { throw new Error('x') } } })
    expect(isNativePlatform()).toBe(false)
  })
})

describe('safeFileName', () => {
  it('conserve un nom simple', () => {
    expect(safeFileName('cours-chimie.pdf')).toBe('cours-chimie.pdf')
  })

  it('neutralise le traversal et les caractères interdits', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('a<b>c:d"e|f?g.pdf')).toBe('a_b_c_d_e_f_g.pdf')
  })

  it('tronque à 120 caractères en gardant l’extension', () => {
    const long = `${'a'.repeat(150)}.pdf`
    const out = safeFileName(long)
    expect(out.length).toBeLessThanOrEqual(120)
    expect(out.endsWith('.pdf')).toBe(true)
  })

  it('repli si nom vide', () => {
    expect(safeFileName('')).toBe('document-alphix')
  })
})

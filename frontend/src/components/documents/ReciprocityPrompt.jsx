/**
 * ALPHIX V2 — ReciprocityPrompt
 * Invite motivante après 3-4 téléchargements/jour : partager à son tour.
 * Léger, mobile-first, affiché une fois par palier et par jour.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { RECIPROCITY_EVENT } from '../../utils/gamification'
import { ROUTE_PATHS } from '../../constants/routes'

export default function ReciprocityPrompt() {
  const navigate = useNavigate()
  const [count, setCount] = useState(null)

  useEffect(() => {
    const onHit = (event) => setCount(Number(event?.detail?.count) || 0)
    window.addEventListener(RECIPROCITY_EVENT, onHit)
    return () => window.removeEventListener(RECIPROCITY_EVENT, onHit)
  }, [])

  const close = useCallback(() => setCount(null), [])

  useEffect(() => {
    if (count == null) return undefined
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, close])

  if (count == null) return null

  return (
    <div className="ax-modal-overlay" role="presentation" onClick={close}>
      <div
        className="ax-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Partagez à votre tour"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="ax-modal__title">Tu révises dur ! 📚</h2>
        <p className="ax-modal__message">
          Tu as déjà téléchargé {count} document{count > 1 ? 's' : ''} aujourd&apos;hui.
          Et si tu partageais ton dernier TP ou tes notes pour aider un camarade
          et débloquer le badge Major ?
        </p>
        <div className="ax-modal__actions">
          <Button variant="ghost" size="sm" onClick={close}>Plus tard</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { close(); navigate(ROUTE_PATHS.UPLOAD) }}
          >
            Partager un document
          </Button>
        </div>
      </div>
    </div>
  )
}

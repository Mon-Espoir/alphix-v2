/**
 * ALPHIX V2 — AdminBroadcastForm
 * Formulaire admin pour diffusion broadcast (titre + message).
 * Responsive, accessible, validation inline.
 */

import { useState } from 'react'
import { NotificationApi } from '../../api/NotificationApi'
import { useNotification } from '../../hooks/useNotification'
import Button from '../ui/Button'

export default function AdminBroadcastForm() {
  const notify = useNotification()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [lastResult, setLastResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLastResult(null)
    if (!title.trim()) {
      setErrors({ title: ['Le titre est requis.'] })
      return
    }
    if (!body.trim()) {
      setErrors({ body: ['Le message est requis.'] })
      return
    }
    setLoading(true)
    try {
      const res = await NotificationApi.broadcast({ title: title.trim(), body: body.trim() })
      const count = res?.count ?? res?.data?.count ?? 0
      setLastResult({ count })
      notify.success(`Diffusion envoyée à ${count} utilisateur(s).`)
      setTitle('')
      setBody('')
    } catch (err) {
      if (err?.errors) setErrors(err.errors)
      else notify.error(err?.message || 'Échec de la diffusion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Diffusion broadcast" className="ax-card ax-card--padded" style={{ display: 'grid', gap: 14 }}>
      <h3 style={{ margin: 0, fontSize: 'var(--ax-text-base)', fontWeight: 600 }}>Diffuser un message (broadcast)</h3>
      <p className="ax-text--muted ax-text--sm" style={{ margin: 0 }}>Envoyez un message personnalisé à tous les utilisateurs. Il apparaîtra dans leur cloche de notifications.</p>

      <div className="ax-form-group">
        <label className="ax-form-group__label" htmlFor="broadcast-title">Titre *</label>
        <input
          id="broadcast-title"
          className={`ax-form-group__input ${errors.title ? 'ax-form-group__input--error' : ''}`}
          type="text"
          maxLength={255}
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p)=>{const n={...p}; delete n.title; return n}) }}
          placeholder="Ex: Maintenance programmée"
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'broadcast-title-error' : undefined}
        />
        {errors.title && <span id="broadcast-title-error" className="ax-form-group__error">{errors.title[0]}</span>}
      </div>

      <div className="ax-form-group">
        <label className="ax-form-group__label" htmlFor="broadcast-body">Message *</label>
        <textarea
          id="broadcast-body"
          className={`ax-form-group__input ${errors.body ? 'ax-form-group__input--error' : ''}`}
          rows={4}
          maxLength={5000}
          value={body}
          onChange={(e) => { setBody(e.target.value); if (errors.body) setErrors((p)=>{const n={...p}; delete n.body; return n}) }}
          placeholder="Contenu du message…"
          required
          aria-invalid={Boolean(errors.body)}
          aria-describedby={errors.body ? 'broadcast-body-error' : undefined}
          style={{ resize: 'vertical' }}
        />
        {errors.body && <span id="broadcast-body-error" className="ax-form-group__error">{errors.body[0]}</span>}
        <span className="ax-text--muted ax-text--xs" aria-live="polite">{body.length}/5000</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button type="submit" variant="primary" size="md" loading={loading} disabled={loading}>
          Envoyer la diffusion
        </Button>
        {(title || body) && !loading && (
          <Button type="button" variant="ghost" size="md" onClick={() => { setTitle(''); setBody(''); setErrors({}); }}>Effacer</Button>
        )}
      </div>

      {lastResult && (
        <div role="status" aria-live="polite" className="ax-alert ax-alert--success">
          Diffusion réussie : {lastResult.count} notification(s) créée(s).
        </div>
      )}
    </form>
  )
}

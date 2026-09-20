/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Admin / Secondary AI Panel
 * ---------------------------------------------------------------------------
 * Toggle ON/OFF + clé API + badge quota. Lecture seule pour le reste :
 * la recherche SQL reste la source de vérité et ne montre jamais d'erreur
 * aux étudiants (repli silencieux).
 */

/* eslint-disable react-hooks/set-state-in-effect -- chargement statut admin, intentionnel */
import { useEffect, useState, useCallback } from 'react'
import AdminSection from './AdminSection'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { SecondaryAIApi } from '../../api/SecondaryAIApi'
import { useNotification } from '../../hooks/useNotification'
import { normalizeApiList } from '../../utils/academic'

function unwrapStatus(res) {
  const data = res?.data ?? res
  if (data && typeof data === 'object' && !Array.isArray(data) && (data.enabled !== undefined || data.status !== undefined)) return data
  const list = normalizeApiList(res)
  return Array.isArray(list) ? {} : (data || {})
}

export default function SecondaryAIPanel() {
  const notify = useNotification()
  const [status, setStatus] = useState({ enabled: true, configured: false, model: '', status: 'unknown', checked_at: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')

  const load = useCallback(async (signal) => {
    setLoading(true)
    try {
      const res = await SecondaryAIApi.status().catch(() => null)
      if (signal?.aborted || !res) return
      setStatus({ enabled: true, configured: false, model: '', status: 'unknown', checked_at: null, ...unwrapStatus(res) })
      setModel('')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const quotaActive = status.status === 'quota_exceeded'
  const authError = status.status === 'auth_error'

  const handleToggle = useCallback(async () => {
    const next = !status.enabled
    setSaving(true)
    try {
      const res = await SecondaryAIApi.update({ enabled: next })
      setStatus((prev) => ({ ...prev, ...unwrapStatus(res), enabled: next }))
      notify.success(next ? 'IA secondaire activée.' : 'IA secondaire désactivée (repli SQL seul).')
    } catch (err) {
      notify.error(err?.message || 'Échec de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }, [status.enabled, notify])

  const handleSaveKey = useCallback(async (e) => {
    e?.preventDefault?.()
    setSaving(true)
    try {
      const res = await SecondaryAIApi.update({ api_key: apiKey })
      setStatus((prev) => ({ ...prev, ...unwrapStatus(res) }))
      setApiKey('')
      notify.success('Clé API mise à jour.')
    } catch (err) {
      notify.error(err?.message || 'Échec de la mise à jour de la clé.')
    } finally {
      setSaving(false)
    }
  }, [apiKey, notify])

  const handleSaveModel = useCallback(async (e) => {
    e?.preventDefault?.()
    setSaving(true)
    try {
      const res = await SecondaryAIApi.update({ model })
      setStatus((prev) => ({ ...prev, ...unwrapStatus(res) }))
      setModel('')
      notify.success('Modèle IA mis à jour.')
    } catch (err) {
      notify.error(err?.message || 'Échec de la mise à jour du modèle.')
    } finally {
      setSaving(false)
    }
  }, [model, notify])

  return (
    <AdminSection title="IA secondaire" description="Suggestions complémentaires après la recherche SQL (non-bloquant, repli silencieux)">
      {(quotaActive || authError) && (
        <p role="status">
          <Badge variant="warning" size="md">
            {quotaActive ? 'Quota Reached - SQL Fallback Active' : 'Auth IA invalide - SQL Fallback Active'}
          </Badge>
        </p>
      )}
      {loading ? (
        <p className="ax-text--muted">Chargement du statut IA…</p>
      ) : (
        <>
          <dl className="ax-definition-list">
            <dt>État</dt>
            <dd>
              <Badge variant={status.enabled ? 'success' : 'default'} size="sm">
                {status.enabled ? 'ON' : 'OFF'}
              </Badge>{' '}
              <Badge variant={status.configured ? 'success' : 'default'} size="sm">
                {status.configured ? 'Clé configurée' : 'Clé absente'}
              </Badge>{' '}
              <Badge variant={quotaActive || authError ? 'warning' : status.status === 'ok' ? 'success' : 'default'} size="sm">
                {status.status || 'unknown'}
              </Badge>
            </dd>
            <dt>Modèle</dt>
            <dd>{status.model || '—'}</dd>
            <dt>Recherche</dt>
            <dd className="ax-text--muted ax-text--sm">SQL toujours premier, IA en suggestion sans erreur côté étudiant.</dd>
          </dl>
          <div className="ax-automation-actions" style={{ marginTop: 12 }}>
            <Button variant={status.enabled ? 'danger' : 'primary'} size="sm" onClick={handleToggle} loading={saving}>
              {status.enabled ? 'Désactiver (OFF)' : 'Activer (ON)'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => load()} disabled={saving}>
              Actualiser statut
            </Button>
          </div>
          <form onSubmit={handleSaveKey} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <input
              className="ax-input"
              type="password"
              autoComplete="new-password"
              placeholder="Clé API IA (laisser vide pour effacer l'override)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              aria-label="Clé API IA secondaire"
              style={{ minWidth: 260, flex: 1 }}
            />
            <Button type="submit" variant="secondary" size="sm" loading={saving}>
              Enregistrer clé
            </Button>
          </form>
          <form onSubmit={handleSaveModel} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <input
              className="ax-input"
              type="text"
              placeholder="Modèle (ex: gpt-4o-mini, deepseek-chat, llama-3)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-label="Modèle IA secondaire"
              style={{ minWidth: 260, flex: 1 }}
            />
            <Button type="submit" variant="secondary" size="sm" loading={saving}>
              Enregistrer modèle
            </Button>
          </form>
        </>
      )}
    </AdminSection>
  )
}

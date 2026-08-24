/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Utilisateurs
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { UserApi } from '../../api/UserApi'
import { normalizeApiList } from '../../utils/academic'
import { filterUsers, paginate } from '../../utils/admin'
import { ROLE_LABELS, ROLE_BADGE_VARIANT } from '../../constants/admin'
import PageHeader from '../../components/common/PageHeader'
import ConfirmModal from '../../components/common/ConfirmModal'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import AdminSearchBar from '../../components/admin/AdminSearchBar'
import AdminTable from '../../components/admin/AdminTable'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useNotification } from '../../hooks/useNotification'

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const notify = useNotification()

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await UserApi.list()
      if (signal?.aborted) return
      setUsers(normalizeApiList(res))
    } catch (err) {
      if (!signal?.aborted) setError(err.message || 'Erreur de chargement.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])



  const filtered = useMemo(() => filterUsers(users, { query, status, role }), [users, query, status, role])
  const paginated = useMemo(() => paginate(filtered, page, 15), [filtered, page])

  const handleToggle = useCallback(async () => {
    if (!actionTarget) return
    const nextStatus = !(actionTarget.status === true || actionTarget.status === 1)
    try {
      await UserApi.patch(actionTarget.id, { status: nextStatus })
      setUsers((prev) => prev.map((u) => (u.id === actionTarget.id ? { ...u, status: nextStatus } : u)))
      notify.success(nextStatus ? 'Utilisateur activé.' : 'Utilisateur désactivé.')
    } catch {
      notify.error('Échec de la mise à jour du statut.')
    } finally {
      setActionTarget(null)
    }
  }, [actionTarget, notify])

  if (loading) return <LoadingScreen label="Chargement des utilisateurs…" />
  if (error) {
    return (
      <div className="ax-container">
        <PageHeader title="Utilisateurs" subtitle="Gestion des comptes" />
        <div className="ax-card ax-card--padded" role="alert"><p>{error}</p><Button size="sm" onClick={() => load()}>Réessayer</Button></div>
      </div>
    )
  }

  const columns = [
    { key: 'name', label: 'Nom' },
    { key: 'email', label: 'Email' },
    {
      key: 'role', label: 'Rôle',
      render: (v) => <Badge variant={ROLE_BADGE_VARIANT[v] || 'default'} size="sm">{ROLE_LABELS[v] || v || '—'}</Badge>,
    },
    {
      key: 'status', label: 'Statut',
      render: (v) => <Badge variant={v === true || v === 1 ? 'success' : 'danger'} size="sm">{v === true || v === 1 ? 'Actif' : 'Inactif'}</Badge>,
    },
    { key: 'last_login_at', label: 'Dernière connexion', render: (v) => (v ? new Date(v).toLocaleDateString('fr-FR') : '—') },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <span className="ax-admin-row-actions">
          <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>Profil</Button>
          <Button variant={row.status ? 'ghost' : 'primary'} size="sm" onClick={() => setActionTarget(row)}>{row.status ? 'Désactiver' : 'Activer'}</Button>
        </span>
      ),
    },
  ]

  const rows = paginated.items.map((u) => ({
    key: u.id, name: u.name, email: u.email, role: u.role, status: u.status, last_login_at: u.last_login_at, actions: null, _raw: u,
  }))

  return (
    <div className="ax-container">
      <PageHeader title="Utilisateurs" subtitle={`${filtered.length} compte(s) — page ${paginated.page}/${paginated.totalPages}`} />

      <div className="ax-admin-filters">
        <AdminSearchBar value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Nom, email ou rôle…" />
        <label className="ax-field">
          <span className="ax-field__label">Statut</span>
          <select className="ax-input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </label>
        <label className="ax-field">
          <span className="ax-field__label">Rôle</span>
          <select className="ax-input" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}>
            <option value="">Tous</option>
            <option value="admin">Admin</option>
            <option value="student">Étudiant</option>
            <option value="teacher">Enseignant</option>
          </select>
        </label>
      </div>

      <AdminTable columns={columns} rows={rows} caption="Liste des utilisateurs" pagination={paginated} onPageChange={setPage} />

      {selected && (
        <div className="ax-modal__overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="ax-modal" role="dialog" aria-modal="true" aria-label={`Profil de ${selected.name}`} onClick={(e) => e.stopPropagation()}>
            <h2 className="ax-modal__title">{selected.name}</h2>
            <dl className="ax-definition-list">
              <dt>Email</dt><dd>{selected.email}</dd>
              <dt>Rôle</dt><dd>{ROLE_LABELS[selected.role] || selected.role}</dd>
              <dt>Statut</dt><dd>{selected.status ? 'Actif' : 'Inactif'}</dd>
              <dt>Dernière connexion</dt><dd>{selected.last_login_at ? new Date(selected.last_login_at).toLocaleString('fr-FR') : '—'}</dd>
              <dt>UUID</dt><dd className="ax-text--mono">{selected.uuid || '—'}</dd>
            </dl>
            <div className="ax-modal__actions"><Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Fermer</Button></div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(actionTarget)}
        title={actionTarget?.status ? 'Désactiver l’utilisateur' : 'Activer l’utilisateur'}
        message={actionTarget ? `Confirmer le changement de statut pour ${actionTarget.name} ?` : ''}
        confirmLabel={actionTarget?.status ? 'Désactiver' : 'Activer'}
        variant={actionTarget?.status ? 'danger' : 'primary'}
        onConfirm={handleToggle}
        onCancel={() => setActionTarget(null)}
      />
    </div>
  )
}
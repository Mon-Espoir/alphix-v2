/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Administration / Utilisateurs
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { UserApi } from '../../api/UserApi'
import { DelegateApi } from '../../api/DelegateApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { normalizeApiList, toSelectOptions } from '../../utils/academic'
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
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [nominateTarget, setNominateTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [resetErrors, setResetErrors] = useState({})
  const [isResetting, setIsResetting] = useState(false)
  const [departments, setDepartments] = useState([])
  const [levels, setLevels] = useState([])
  const [nominateDeptId, setNominateDeptId] = useState('')
  const [nominateLevelId, setNominateLevelId] = useState('')
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

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return
    try {
      await DelegateApi.revoke(revokeTarget.id)
      setUsers((prev) => prev.map((u) => (u.id === revokeTarget.id ? { ...u, role: 'student' } : u)))
      notify.success('Délégué révoqué (rôle étudiant).')
    } catch (err) {
      notify.error(err?.message || 'Échec de la révocation.')
    } finally {
      setRevokeTarget(null)
    }
  }, [revokeTarget, notify])

  const openResetPassword = useCallback((row) => {
    setResetTarget(row)
    setResetPassword('')
    setResetPasswordConfirm('')
    setResetErrors({})
  }, [])

  const handleResetPassword = useCallback(async () => {
    if (!resetTarget) return
    setResetErrors({})

    // Laissez vide => mot de passe temporaire généré côté serveur.
    const hasPassword = resetPassword.trim().length > 0

    if (hasPassword && resetPassword.length < 8) {
      setResetErrors((p) => ({ ...p, password: ['Le mot de passe doit contenir au moins 8 caractères.'] }))
      return
    }
    if (hasPassword && resetPassword !== resetPasswordConfirm) {
      setResetErrors((p) => ({ ...p, password_confirmation: ['La confirmation ne correspond pas.'] }))
      return
    }

    setIsResetting(true)
    try {
      const res = await UserApi.resetPassword(resetTarget.id, hasPassword
        ? { password: resetPassword, password_confirmation: resetPasswordConfirm }
        : {})
      const temporary = res?.data?.temporary_password
      notify.success(
        temporary
          ? `Mot de passe temporaire généré pour ${resetTarget.email || resetTarget.name} : ${temporary}`
          : `Mot de passe réinitialisé pour ${resetTarget.email || resetTarget.name}.`,
      )
      setResetTarget(null)
      setResetPassword('')
      setResetPasswordConfirm('')
    } catch (err) {
      if (err?.errors) setResetErrors(err.errors)
      else notify.error(err?.message || 'Échec de la réinitialisation du mot de passe.')
    } finally {
      setIsResetting(false)
    }
  }, [resetTarget, resetPassword, resetPasswordConfirm, notify])

  const openNominate = useCallback((row) => {
    setNominateTarget(row)
    setNominateDeptId(row._raw?.department_id != null ? String(row._raw.department_id) : '')
    setNominateLevelId(row._raw?.level_id != null ? String(row._raw.level_id) : '')
    DepartmentApi.list().then(
      (res) => setDepartments(normalizeApiList(res)),
      () => setDepartments([]),
    )
    LevelApi.list().then(
      (res) => setLevels(normalizeApiList(res)),
      () => setLevels([]),
    )
  }, [])

  const handleNominate = useCallback(async () => {
    if (!nominateTarget) return
    if (!nominateLevelId) {
      notify.warning('Sélectionnez la classe (niveau) du délégué.')
      return
    }
    try {
      await DelegateApi.promote({
        user_id: nominateTarget.id,
        ...(nominateDeptId ? { department_id: Number(nominateDeptId) } : {}),
        level_id: Number(nominateLevelId),
      })
      setUsers((prev) => prev.map((u) => (u.id === nominateTarget.id
        ? {
          ...u,
          role: 'delegate',
          department_id: nominateDeptId ? Number(nominateDeptId) : u.department_id,
          level_id: Number(nominateLevelId),
        }
        : u)))
      notify.success(`Délégué nommé : ${nominateTarget.email || nominateTarget.name}.`)
    } catch (err) {
      notify.error(err?.message || 'Échec de la nomination.')
    } finally {
      setNominateTarget(null)
      setNominateDeptId('')
      setNominateLevelId('')
    }
  }, [nominateTarget, nominateDeptId, nominateLevelId, notify])

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
      render: (_, row) => {
        const role = String(row.role || '').toLowerCase()
        return (
          <span className="ax-admin-row-actions">
            <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>Profil</Button>
            <Button variant={row.status ? 'ghost' : 'primary'} size="sm" onClick={() => setActionTarget(row)}>{row.status ? 'Désactiver' : 'Activer'}</Button>
            <Button variant="ghost" size="sm" onClick={() => openResetPassword(row)}>Réinitialiser le mot de passe</Button>
            {role === 'delegate' && (
              <Button variant="danger" size="sm" onClick={() => setRevokeTarget(row)}>Révoquer</Button>
            )}
            {(role === 'student' || role === 'teacher') && (
              <Button variant="primary" size="sm" onClick={() => openNominate(row)}>Nommer</Button>
            )}
          </span>
        )
      },
    },
  ]

  const rows = paginated.items.map((u) => ({
    key: u.id, id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, last_login_at: u.last_login_at, actions: null, _raw: u,
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
            <option value="delegate">Délégué</option>
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
              <dt>Nom d&apos;utilisateur</dt><dd>{selected.username || '—'}</dd>
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

      <ConfirmModal
        open={Boolean(revokeTarget)}
        title="Révoquer le délégué"
        message={revokeTarget ? `Retirer le rôle délégué à ${revokeTarget.name} (retour étudiant) ?` : ''}
        confirmLabel="Révoquer"
        variant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

      {nominateTarget && (
        <div className="ax-modal__overlay" role="presentation" onClick={() => setNominateTarget(null)}>
          <div
            className="ax-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Nommer délégué : ${nominateTarget.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="ax-modal__title">Nommer un délégué</h2>
            <p className="ax-modal__message">
              {nominateTarget.name} ({nominateTarget.email}) deviendra délégué de son département et de sa classe.
            </p>
            <label className="ax-field">
              <span className="ax-field__label">Département</span>
              <select
                className="ax-input"
                value={nominateDeptId}
                onChange={(e) => setNominateDeptId(e.target.value)}
                aria-label="Département du délégué"
              >
                <option value="">Conserver celui du compte…</option>
                {toSelectOptions(departments).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="ax-field">
              <span className="ax-field__label">Classe (niveau) <span className="ax-form-group__required">*</span></span>
              <select
                className="ax-input"
                value={nominateLevelId}
                onChange={(e) => setNominateLevelId(e.target.value)}
                aria-label="Classe (niveau) du délégué"
                required
              >
                <option value="">BAC 1, BAC 2, BAC 3…</option>
                {toSelectOptions(levels).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="ax-modal__actions">
              <Button variant="ghost" size="sm" onClick={() => setNominateTarget(null)}>Annuler</Button>
              <Button variant="primary" size="sm" onClick={handleNominate}>Nommer délégué</Button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="ax-modal__overlay" role="presentation" onClick={() => setResetTarget(null)}>
          <div
            className="ax-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Réinitialiser le mot de passe : ${resetTarget.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="ax-modal__title">Réinitialiser le mot de passe</h2>
            <p className="ax-modal__message">
              Saisissez un nouveau mot de passe pour <strong>{resetTarget.email || resetTarget.name}</strong>.
            </p>
            <label className="ax-field">
              <span className="ax-field__label">Nouveau mot de passe</span>
              <input
                type="password"
                className={`ax-input ${resetErrors.password ? 'ax-form-group__input--error' : ''}`}
                placeholder="8 caractères minimum"
                value={resetPassword}
                onChange={(e) => { setResetPassword(e.target.value); setResetErrors((p) => { const n = { ...p }; delete n.password; return n }) }}
                aria-label="Nouveau mot de passe"
              />
              {resetErrors.password && <span className="ax-form-group__error">{resetErrors.password[0]}</span>}
            </label>
            <label className="ax-field">
              <span className="ax-field__label">Confirmer le mot de passe</span>
              <input
                type="password"
                className={`ax-input ${resetErrors.password_confirmation ? 'ax-form-group__input--error' : ''}`}
                placeholder="Répétez le nouveau mot de passe"
                value={resetPasswordConfirm}
                onChange={(e) => { setResetPasswordConfirm(e.target.value); setResetErrors((p) => { const n = { ...p }; delete n.password_confirmation; return n }) }}
                aria-label="Confirmation du nouveau mot de passe"
              />
              {resetErrors.password_confirmation && <span className="ax-form-group__error">{resetErrors.password_confirmation[0]}</span>}
            </label>
            <div className="ax-modal__actions">
              <Button variant="ghost" size="sm" onClick={() => setResetTarget(null)} disabled={isResetting}>Annuler</Button>
              <Button variant="primary" size="sm" onClick={handleResetPassword} loading={isResetting}>Réinitialiser le mot de passe</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
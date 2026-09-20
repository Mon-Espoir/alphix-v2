/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Espace Délégué
 * ---------------------------------------------------------------------------
 * Mobile-first : KPIs scopés (département), mes cours (CRUD via les pages
 * cours existantes), passation autonome par email. Lecture seule pour le
 * reste : aucune mutation hors périmètre.
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DelegateApi } from '../../api/DelegateApi'
import { DepartmentApi } from '../../api/DepartmentApi'
import { LevelApi } from '../../api/LevelApi'
import { ROUTE_PATHS } from '../../constants/routes'
import { Button, Badge, StatCard } from '../../components/ui'
import LoadingScreen from '../../components/feedback/LoadingScreen'
import PageHeader from '../../components/common/PageHeader'
import AdminSection from '../../components/admin/AdminSection'
import { useNotification } from '../../hooks/useNotification'
import { useAuth } from '../../hooks/useAuth'
import { hasAdminAccess, hasDelegateAccess } from '../../utils/admin'
import { normalizeApiList, toSelectOptions } from '../../utils/academic'

export default function DelegateDashboardPage() {
  const notify = useNotification()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  // Vue admin : nomination directe (pas de stats perso ni passation).
  const isAdminView = hasAdminAccess(user) && !hasDelegateAccess(user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [isHandingOver, setIsHandingOver] = useState(false)
  const [departments, setDepartments] = useState([])
  const [levels, setLevels] = useState([])
  const [nominateEmail, setNominateEmail] = useState('')
  const [nominateDeptId, setNominateDeptId] = useState('')
  const [nominateLevelId, setNominateLevelId] = useState('')
  const [isNominating, setIsNominating] = useState(false)
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [resetStudentPassword, setResetStudentPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const load = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    try {
      const res = await DelegateApi.stats()
      if (signal?.aborted) return
      setData(res?.data ?? res)
    } catch (err) {
      if (!signal?.aborted) setError(err?.message || 'Erreur de chargement.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Super admin : pas de stats perso a charger (nomination uniquement).
    if (isAdminView) {
      setLoading(false)
      DepartmentApi.list().then(
        (res) => setDepartments(normalizeApiList(res)),
        () => setDepartments([]),
      )
      LevelApi.list().then(
        (res) => setLevels(normalizeApiList(res)),
        () => setLevels([]),
      )
      return undefined
    }
    const ctrl = new AbortController()
    load(ctrl.signal)
    DelegateApi.students()
      .then(
        (res) => setStudents(Array.isArray(res?.data) ? res.data : []),
        () => setStudents([]),
      )
    return () => ctrl.abort()
  }, [load, isAdminView])

  const handleHandover = useCallback(async (e) => {
    e?.preventDefault?.()
    if (!email.trim()) {
      notify.warning('Saisissez l’email du successeur.')
      return
    }
    setIsHandingOver(true)
    try {
      await DelegateApi.handover(email.trim())
      notify.success('Passation effectuée. Votre rôle est redevenu étudiant.')
      setEmail('')
      await refreshUser()
      navigate(ROUTE_PATHS.DASHBOARD)
    } catch (err) {
      notify.error(err?.message || 'Échec de la passation.')
    } finally {
      setIsHandingOver(false)
    }
  }, [email, notify, refreshUser, navigate])

  const handleNominate = useCallback(async (e) => {
    e?.preventDefault?.()
    if (!nominateEmail.trim()) {
      notify.warning('Saisissez l’email du futur délégué.')
      return
    }
    if (!nominateLevelId) {
      notify.warning('Sélectionnez la classe (niveau) du délégué.')
      return
    }
    setIsNominating(true)
    try {
      await DelegateApi.promote({
        email: nominateEmail.trim(),
        ...(nominateDeptId ? { department_id: Number(nominateDeptId) } : {}),
        level_id: Number(nominateLevelId),
      })
      notify.success(`Délégué nommé : ${nominateEmail.trim()}.`)
      setNominateEmail('')
      setNominateDeptId('')
      setNominateLevelId('')
    } catch (err) {
      notify.error(err?.message || 'Échec de la nomination.')
    } finally {
      setIsNominating(false)
    }
  }, [nominateEmail, nominateDeptId, nominateLevelId, notify])

  const handleResetStudent = useCallback(async (e) => {
    e?.preventDefault?.()
    setResetError('')
    if (!selectedStudentId) {
      notify.warning('Sélectionnez un étudiant de votre classe.')
      return
    }
    const hasPassword = resetStudentPassword.trim().length > 0
    if (hasPassword && resetStudentPassword.length < 8) {
      setResetError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setIsResetting(true)
    try {
      const res = await DelegateApi.resetPassword(selectedStudentId, hasPassword ? { password: resetStudentPassword } : {})
      const temporary = res?.data?.temporary_password
      notify.success(
        temporary
          ? `Mot de passe temporaire pour ${res?.data?.email || selectedStudentId} : ${temporary}`
          : `Mot de passe réinitialisé pour ${res?.data?.email || selectedStudentId}.`,
      )
      setSelectedStudentId('')
      setResetStudentPassword('')
    } catch (err) {
      notify.error(err?.message || 'Échec de la réinitialisation du mot de passe.')
    } finally {
      setIsResetting(false)
    }
  }, [selectedStudentId, resetStudentPassword, notify])

  if (loading) return <LoadingScreen label="Chargement de l’Espace Délégué…" />

  const totals = data?.totals || {}
  const courses = Array.isArray(data?.courses) ? data.courses : []
  const departmentOptions = toSelectOptions(departments)

  // Vue admin : nomination directe (les stats perso ne s'appliquent pas).
  if (isAdminView) {
    return (
      <div className="ax-container">
        <PageHeader
          title="Espace Délégué"
          subtitle={`Supervision — ${user?.name || ''}`}
          actions={<Badge variant="danger" size="md">Admin</Badge>}
        />

        <AdminSection title="Nommer un délégué" description="Saisissez l'email du compte (étudiant ou enseignant), son département et sa classe">
          <form onSubmit={handleNominate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="ax-input"
              type="email"
              required
              placeholder="futur.delegue@email.com"
              value={nominateEmail}
              onChange={(e) => setNominateEmail(e.target.value)}
              aria-label="Email du futur délégué"
              style={{ minWidth: 240, flex: 1 }}
            />
            <select
              className="ax-input"
              value={nominateDeptId}
              onChange={(e) => setNominateDeptId(e.target.value)}
              aria-label="Département du délégué"
              style={{ minWidth: 200 }}
            >
              <option value="">Département (requis si absent du compte)…</option>
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              className="ax-input"
              value={nominateLevelId}
              onChange={(e) => setNominateLevelId(e.target.value)}
              aria-label="Classe (niveau) du délégué"
              required
              style={{ minWidth: 160 }}
            >
              <option value="">Classe (BAC 1, 2, 3…)…</option>
              {toSelectOptions(levels).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Button type="submit" variant="primary" size="sm" loading={isNominating}>
              Nommer délégué
            </Button>
          </form>
          <p className="ax-text--muted ax-text--xs" style={{ marginTop: 8 }}>
            Le compte devient immédiatement délégué de ce département. Gestion fine : <Link to={ROUTE_PATHS.ADMIN_USERS} className="ax-link">Administration → Utilisateurs</Link>.
          </p>
        </AdminSection>
      </div>
    )
  }

  return (
    <div className="ax-container">
      <PageHeader
        title="Espace Délégué"
        subtitle={`Département #${data?.department_id ?? '—'}${data?.level ? ` — ${data.level.name}` : ''} — ${user?.name || ''}`}
        actions={<Badge variant="primary" size="md">Délégué</Badge>}
      />

      {error && (
        <div className="ax-card ax-card--padded" role="alert" style={{ marginBottom: 'var(--ax-space-4)' }}>
          <p>{error}</p>
          <Button size="sm" onClick={() => load()}>Réessayer</Button>
        </div>
      )}

      {/* KPIs scopés */}
      <div className="ax-automation-grid">
        <StatCard label="Cours gérés" value={String(totals.courses ?? 0)} icon={<span aria-hidden="true">📖</span>} />
        <StatCard label="Documents" value={String(totals.documents ?? 0)} icon={<span aria-hidden="true">📄</span>} />
        <StatCard label="Vues" value={String(totals.views ?? 0)} icon={<span aria-hidden="true">👁</span>} />
        <StatCard label="Téléchargements" value={String(totals.downloads ?? 0)} icon={<span aria-hidden="true">⬇</span>} />
        <StatCard label="En attente" value={String(totals.pending ?? 0)} icon={<span aria-hidden="true">⏳</span>} />
        <StatCard label="Mes dépôts" value={String(totals.my_uploads ?? 0)} icon={<span aria-hidden="true">📤</span>} />
      </div>

      {/* Mes cours (CRUD via pages cours, périmètre imposé backend) */}
      <AdminSection title="Mes cours" description="Création, modification et suppression dans votre département">
        <div className="ax-automation-actions" style={{ marginBottom: 12 }}>
          <Link
            to={`${ROUTE_PATHS.COURSES}/create`}
            state={{ presetDepartmentId: data?.department_id }}
            className="ax-btn ax-btn--primary ax-btn--sm"
          >
            Nouveau cours
          </Link>
          <Button variant="ghost" size="sm" onClick={() => load()}>Actualiser</Button>
        </div>
        {courses.length === 0 ? (
          <p className="ax-text--muted">Aucun cours dans votre département.</p>
        ) : (
          <ul className="ax-admin-list" role="list">
            {courses.map((c) => (
              <li key={c.id} className="ax-admin-list__item">
                <span>{c.code ? `${c.code} — ` : ''}{c.name} <span className="ax-text--muted">({c.documents_count ?? 0} docs • {c.views ?? 0} vues • {c.downloads ?? 0} tél.)</span></span>
                <Link
                  to={`${ROUTE_PATHS.COURSES}/${c.id}/edit`}
                  state={{ course: c, presetDepartmentId: data?.department_id }}
                  className="ax-btn ax-btn--ghost ax-btn--sm"
                >
                  Modifier
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {/* Passation autonome */}
      <AdminSection title="Désigner mon successeur" description="Saisissez son email — il doit appartenir au même département">
        <form onSubmit={handleHandover} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="ax-input"
            type="email"
            required
            placeholder="successeur@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email du successeur"
            style={{ minWidth: 240, flex: 1 }}
          />
          <Button type="submit" variant="primary" size="sm" loading={isHandingOver}>
            Transmettre le rôle
          </Button>
        </form>
        <p className="ax-text--muted ax-text--xs" style={{ marginTop: 8 }}>
          La passation est immédiate : le successeur devient délégué et votre rôle redevient étudiant.
        </p>
      </AdminSection>

      {/* Réinitialisation du mot de passe d'un étudiant de la classe */}
      <AdminSection
        title="Réinitialiser un mot de passe"
        description="En cas d'oubli — étudiant de votre promotion/classe uniquement"
      >
        <form onSubmit={handleResetStudent} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="ax-field" style={{ minWidth: 240, flex: 1 }}>
            <span className="ax-field__label">Étudiant</span>
            <select
              className="ax-input"
              value={selectedStudentId}
              onChange={(e) => { setSelectedStudentId(e.target.value); setResetError('') }}
              aria-label="Étudiant concerné"
            >
              <option value="">{students.length ? 'Choisir un étudiant…' : 'Aucun étudiant dans votre classe'}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.username ? ` (@${s.username})` : ''} — {s.email}
                </option>
              ))}
            </select>
          </label>
          <label className="ax-field" style={{ minWidth: 200 }}>
            <span className="ax-field__label">Nouveau mot de passe <span className="ax-text--muted">(vide = généré)</span></span>
            <input
              className={`ax-input ${resetError ? 'ax-form-group__input--error' : ''}`}
              type="password"
              placeholder="8 caractères minimum"
              value={resetStudentPassword}
              onChange={(e) => { setResetStudentPassword(e.target.value); setResetError('') }}
              aria-label="Nouveau mot de passe"
            />
          </label>
          <Button type="submit" variant="primary" size="sm" loading={isResetting} disabled={students.length === 0}>
            Réinitialiser le mot de passe
          </Button>
        </form>
        {resetError && <p className="ax-form-group__error" style={{ marginTop: 8 }}>{resetError}</p>}
      </AdminSection>
    </div>
  )
}

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Page d'inscription
 * ---------------------------------------------------------------------------
 * Formulaire d'inscription avec validation Laravel 422.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui'

/**
 * @returns {import('react').JSX.Element}
 */
export default function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setGlobalError('')

    // --- Vérifications INSTANTANÉES (sans réseau) : l'étudiant sait
    // immédiatement ce qui ne va pas, dans sa langue, champ par champ. ---
    // Pas de champ email : inutile (aucune récupération par email n'existe,
    // la connexion se fait au nom d'utilisateur). 3 champs suffisent.
    const cleanName = name.trim()
    const cleanUsername = username.trim().toLowerCase()
    const localErrors = {}
    if (!cleanName) {
      localErrors.name = ['Indique ton nom complet (ex. Jean Ndayisaba).']
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(cleanUsername)) {
      localErrors.username = ['Minuscules, chiffres et . _ - uniquement, 3 à 50 caractères, sans espaces.']
    }
    if (password.length < 8) {
      localErrors.password = ['Ton mot de passe doit contenir au moins 8 caractères.']
    } else if (password !== passwordConfirmation) {
      localErrors.password = ['Les deux mots de passe ne correspondent pas, vérifie la confirmation.']
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors)
      return
    }

    try {
      await register({
        name: cleanName,
        username: cleanUsername,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate(ROUTE_PATHS.DASHBOARD)
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors)
      } else {
        setGlobalError(err?.message || 'Erreur lors de l\'inscription.')
      }
    }
  }

  const clearFieldError = (field) => {
    if (errors[field]) {
      setErrors((p) => { const n = { ...p }; delete n[field]; return n })
    }
  }

  return (
    <div className="ax-auth-page">
      <div className="ax-auth-card">
        <div className="ax-auth-card__header">
          <div className="ax-auth-card__logo" aria-hidden="true">A</div>
          <h1 className="ax-auth-card__title">Inscription</h1>
          <p className="ax-auth-card__subtitle">
            Creer votre compte ALPHIX
          </p>
        </div>

        <form className="ax-auth-card__form" onSubmit={handleSubmit}>
          {globalError && (
            <div className="ax-alert ax-alert--error" role="alert">
              {globalError}
            </div>
          )}

          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="reg-name">Nom complet</label>
            <input
              id="reg-name"
              className={`ax-form-group__input ${errors.name ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="Jean Ndayisaba"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError('name') }}
              required
              autoComplete="name"
              autoFocus
            />
            {errors.name && <span className="ax-form-group__error">{errors.name[0]}</span>}
          </div>

          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="reg-username">Nom d&apos;utilisateur</label>
            <input
              id="reg-username"
              className={`ax-form-group__input ${errors.username ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="jean.n"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearFieldError('username') }}
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
            />
            <span className="ax-form-group__hint">Lettres minuscules, chiffres et . _ - (pas d&apos;espaces).</span>
            {errors.username && <span className="ax-form-group__error">{errors.username[0]}</span>}
          </div>

          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="reg-password">Mot de passe</label>
            <input
              id="reg-password"
              className={`ax-form-group__input ${errors.password ? 'ax-form-group__input--error' : ''}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
              required
              autoComplete="new-password"
            />
            <span className="ax-form-group__hint">8 caractères minimum.</span>
            {errors.password && <span className="ax-form-group__error">{errors.password[0]}</span>}
          </div>

          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="reg-password-confirm">Confirmer le mot de passe</label>
            <input
              id="reg-password-confirm"
              className="ax-form-group__input"
              type="password"
              placeholder="••••••••"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
            Creer un compte
          </Button>
        </form>

        <div className="ax-auth-card__footer">
          Deja un compte ?{' '}
          <Link to={ROUTE_PATHS.LOGIN}>Se connecter</Link>
        </div>
      </div>
    </div>
  )
}

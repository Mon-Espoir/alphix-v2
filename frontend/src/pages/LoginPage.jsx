/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Page de connexion
 * ---------------------------------------------------------------------------
 * Formulaire de connexion avec validation Laravel 422.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants/routes'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui'

/**
 * @returns {import('react').JSX.Element}
 */
export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setGlobalError('')

    try {
      await login({ login: loginId, password })
      navigate(ROUTE_PATHS.DASHBOARD)
    } catch (err) {
      if (err?.errors) {
        setErrors(err.errors)
      } else {
        setGlobalError(err?.message || 'Identifiants incorrects.')
      }
    }
  }

  return (
    <div className="ax-auth-page">
      <div className="ax-auth-card">
        <div className="ax-auth-card__header">
          <div className="ax-auth-card__logo" aria-hidden="true">A</div>
          <h1 className="ax-auth-card__title">Connexion</h1>
          <p className="ax-auth-card__subtitle">
            Accedez a votre espace ALPHIX
          </p>
        </div>

        <form className="ax-auth-card__form" onSubmit={handleSubmit}>
          {globalError && (
            <div className="ax-alert ax-alert--error" role="alert">
              {globalError}
            </div>
          )}

          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="login-email">Nom d&apos;utilisateur ou Email</label>
            <input
              id="login-email"
              className={`ax-form-group__input ${errors.login || errors.identifier ? 'ax-form-group__input--error' : ''}`}
              type="text"
              placeholder="votre@email.com ou votre.nom"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value)
                if (errors.login || errors.identifier) setErrors((p) => { const n = { ...p }; delete n.login; delete n.identifier; return n })
              }}
              required
              autoComplete="username"
              autoFocus
            />
            {(errors.login || errors.identifier) && (
              <span className="ax-form-group__error">{(errors.login || errors.identifier)[0]}</span>
            )}
          </div>

          <div className="ax-form-group">
            <label className="ax-form-group__label" htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              className={`ax-form-group__input ${errors.password ? 'ax-form-group__input--error' : ''}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((p) => { const n = { ...p }; delete n.password; return n })
              }}
              required
              autoComplete="current-password"
            />
            {errors.password && <span className="ax-form-group__error">{errors.password[0]}</span>}
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
            Se connecter
          </Button>
        </form>

        <div className="ax-auth-card__footer">
          Pas encore de compte ?{' '}
          <Link to={ROUTE_PATHS.REGISTER}>S&apos;inscrire</Link>
        </div>
      </div>
    </div>
  )
}

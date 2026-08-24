/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Frontière d'erreur React
 * ---------------------------------------------------------------------------
 * Capture toute erreur de rendu non geree dans le sous-arbre englobe,
 * affiche un repli sur et propose une reinitialisation.
 *
 * Placée au sommet de l'arbre (AppProviders) : dernier rempart avant
 * l'ecran blanc. Peut aussi etre instanciee localement pour isoler une
 * zone critique de l'application.
 *
 * Note : React n'offre pas d'equivalent par hooks — composant de classe,
 * pattern officiel (React 19 inclus).
 */

import { Component } from 'react'

/**
 * Frontiere d'erreur generique.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  /**
   * Derive l'etat d'erreur depuis l'exception capturee.
   * @param {Error} error - Erreur levee pendant le rendu.
   * @returns {{error: Error}} Nouvel etat.
   */
  static getDerivedStateFromError(error) {
    return { error }
  }

  /**
   * Journalise l'erreur (point d'extension future : reporting Sentry...).
   * @param {Error} error - Erreur capturee.
   * @param {import('react').ErrorInfo} errorInfo - Contexte React.
   * @returns {void}
   */
  componentDidCatch(error, errorInfo) {
    // Journalisation console uniquement ; jamais de donnee sensible.
    console.error('[ErrorBoundary]', error, errorInfo?.componentStack)
  }

  /**
   * Reinitialise la frontiere : retente le rendu du sous-arbre.
   * @returns {void}
   */
  handleReset() {
    this.setState({ error: null })
  }

  /**
   * @returns {import('react').JSX.Element} Repli personnalise ou defaut.
   */
  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (fallback) return fallback

      return (
        <div className="error-boundary" role="alert">
          <h1 className="error-boundary__title">Une erreur est survenue</h1>
          <p className="error-boundary__message">
            Une erreur inattendue s&apos;est produite. Vous pouvez reessayer.
          </p>
          <button type="button" className="error-boundary__retry" onClick={this.handleReset}>
            Reessayer
          </button>
        </div>
      )
    }

    return children
  }
}

export default ErrorBoundary

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Page d'accueil
 * ---------------------------------------------------------------------------
 * Hero section + statistiques + features. Design system ALPHIX.
 */

import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants/routes'
import { Button, StatCard, Container, Section } from '../components/ui'

const FEATURES = [
  {
    icon: '📚',
    title: 'Documents universitaires',
    desc: 'Accedez a une bibliotheque complete de documents academiques de toutes les facultes.',
    color: 'blue',
  },
  {
    icon: '🔍',
    title: 'Recherche avancee',
    desc: 'Trouvez rapidement ce que vous cherchez grace a notre moteur de recherche intelligent.',
    color: 'green',
  },
  {
    icon: '📥',
    title: 'Telechargement facile',
    desc: 'Telechargez les documents en quelques clics, disponible hors ligne sur mobile.',
    color: 'red',
  },
]

/**
 * @returns {import('react').JSX.Element}
 */
export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <div className="ax-hero">
        <Container>
          <div className="ax-hero__badge">
            Plateforme documentaire universitaire
          </div>

          <h1 className="ax-hero__title">
            Bienvenue sur <span className="ax-hero__title-highlight">ALPHIX</span>
          </h1>

          <p className="ax-hero__subtitle">
            La plateforme de reference pour les documents universitaires du Burundi.
            Accedez, partagez et decouvrez les ressources academiques d&apos;excellence.
          </p>

          <div className="ax-hero__actions">
            <Link to="/search">
              <Button variant="primary" size="lg">Explorer</Button>
            </Link>
            <Link to={ROUTE_PATHS.LOGIN}>
              <Button variant="outline" size="lg">Connexion</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="ax-hero__stats">
            <StatCard
              icon={<span role="img" aria-label="Documents">📄</span>}
              label="Documents"
              value="2 450+"
              trend={12}
            />
            <StatCard
              icon={<span role="img" aria-label="Facultes">🏛</span>}
              label="Facultes"
              value="8"
            />
            <StatCard
              icon={<span role="img" aria-label="Cours">📖</span>}
              label="Cours"
              value="320+"
              trend={8}
            />
            <StatCard
              icon={<span role="img" aria-label="Utilisateurs">👥</span>}
              label="Utilisateurs"
              value="1 200+"
              trend={24}
              trendLabel="ce mois"
            />
          </div>
        </Container>
      </div>

      {/* Features */}
      <Section title="Pourquoi ALPHIX ?" subtitle="Une solution complete pour la gestion documentaire universitaire">
        <Container>
          <div className="ax-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="ax-feature-card">
                <div className={`ax-feature-card__icon ax-feature-card__icon--${f.color}`}>
                  <span role="img" aria-hidden="true">{f.icon}</span>
                </div>
                <h3 className="ax-feature-card__title">{f.title}</h3>
                <p className="ax-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section>
        <Container size="sm">
          <div style={{ textAlign: 'center', padding: 'var(--ax-space-8) 0 var(--ax-space-12)' }}>
            <h2 style={{ fontSize: 'var(--ax-text-2xl)', fontWeight: 'var(--ax-font-bold)', marginBottom: 'var(--ax-space-4)' }}>
              Pret a commencer ?
            </h2>
            <p style={{ color: 'var(--ax-text-secondary)', marginBottom: 'var(--ax-space-6)', fontSize: 'var(--ax-text-sm)' }}>
              Rejoignez la communaute universitaire et accedez a des milliers de documents.
            </p>
            <Link to={ROUTE_PATHS.REGISTER}>
              <Button variant="primary" size="lg">Creer un compte</Button>
            </Link>
          </div>
        </Container>
      </Section>
    </>
  )
}

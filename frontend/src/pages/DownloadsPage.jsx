/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Mes Téléchargements (Téléchargés + Favoris)
 * ---------------------------------------------------------------------------
 * Page unique : deux onglets [Téléchargés (N)] | [Favoris (M)].
 * Chaque item ouvre le lecteur in-app (/documents/:id/preview).
 */

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FavoriteApi } from '../api/FavoriteApi'
import { DownloadsApi } from '../api/DownloadsApi'
import { normalizeApiList } from '../utils/academic'
import { Container, Badge } from '../components/ui'
import PageHeader from '../components/common/PageHeader'
import { ROUTE_PATHS } from '../constants/routes'

function DocCard({ doc }) {
  return (
    <div className="ax-card ax-card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <Badge variant="primary" size="sm">{doc.doc_type || 'document'}</Badge>
        <h3 style={{ fontSize: 'var(--ax-text-base)', fontWeight: 600, margin: '8px 0 4px' }}>{doc.title}</h3>
        <p style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-tertiary)', margin: 0 }}>{doc.original_name || ''}</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}`} className="ax-btn ax-btn--ghost ax-btn--sm">Fiche</Link>
        <Link to={`${ROUTE_PATHS.DOCUMENTS}/${doc.id}/preview`} className="ax-btn ax-btn--secondary ax-btn--sm">Aperçu</Link>
      </div>
    </div>
  )
}

export default function DownloadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'favorites' ? 'favorites' : 'downloaded'
  const [tab, setTab] = useState(initialTab)
  const [downloaded, setDownloaded] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      DownloadsApi.mine().catch(() => []),
      FavoriteApi.list().catch(() => []),
    ]).then(([dlRes, favRes]) => {
      if (cancelled) return
      setDownloaded(normalizeApiList(dlRes))
      setFavorites(normalizeApiList(favRes))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const selectTab = (next) => {
    setTab(next)
    setSearchParams(next === 'favorites' ? { tab: 'favorites' } : {}, { replace: true })
  }

  const items = tab === 'favorites' ? favorites : downloaded

  if (loading) return <Container><p>Chargement de vos téléchargements...</p></Container>

  return (
    <Container>
      <PageHeader title="Mes Téléchargements" subtitle={`${downloaded.length} téléchargé(s) • ${favorites.length} favori(s)`} />

      <div role="tablist" aria-label="Téléchargés ou favoris" style={{ display: 'flex', gap: 8, marginBottom: 'var(--ax-space-4)' }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'downloaded'}
          className={`ax-btn ax-btn--sm ${tab === 'downloaded' ? 'ax-btn--primary' : 'ax-btn--ghost'}`}
          onClick={() => selectTab('downloaded')}
        >
          Téléchargés ({downloaded.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'favorites'}
          className={`ax-btn ax-btn--sm ${tab === 'favorites' ? 'ax-btn--primary' : 'ax-btn--ghost'}`}
          onClick={() => selectTab('favorites')}
        >
          Favoris ({favorites.length})
        </button>
      </div>

      {items.length === 0 ? (
        <div className="ax-empty-state">
          <p className="ax-empty-state__title">{tab === 'favorites' ? 'Aucun favori' : 'Aucun téléchargement'}</p>
          <p className="ax-empty-state__desc">
            {tab === 'favorites'
              ? 'Ajoutez des documents à vos favoris depuis l’explorateur.'
              : 'Les documents que vous téléchargez apparaîtront ici.'}
          </p>
          <Link to={ROUTE_PATHS.DOCUMENTS} className="ax-btn ax-btn--primary">Explorer</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--ax-space-3)' }}>
          {items.map((doc) => <DocCard key={doc.id} doc={doc} />)}
        </div>
      )}
    </Container>
  )
}

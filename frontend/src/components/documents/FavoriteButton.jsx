import { useState, useEffect } from 'react'
import { FavoriteApi } from '../../api/FavoriteApi'
import { useNotification } from '../../hooks/useNotification'

export default function FavoriteButton({ documentId, size = 'sm' }) {
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(false)
  const notify = useNotification()

  useEffect(() => {
    let cancelled = false
    FavoriteApi.check(documentId).then((res) => {
      if (!cancelled) setIsFav(Boolean(res?.is_favorite ?? res?.data?.is_favorite))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [documentId])

  const toggle = async () => {
    setLoading(true)
    try {
      if (isFav) {
        await FavoriteApi.remove(documentId)
        setIsFav(false)
        notify.success('Retiré des favoris.')
      } else {
        await FavoriteApi.add(documentId)
        setIsFav(true)
        notify.success('Ajouté aux favoris.')
      }
    } catch (err) {
      notify.error(err?.message || 'Erreur favoris.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className={`ax-btn ${isFav ? 'ax-btn--primary' : 'ax-btn--ghost'} ax-btn--${size}`}
      onClick={toggle}
      disabled={loading}
      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-pressed={isFav}
    >
      {isFav ? '★ Favori' : '☆ Favori'}
    </button>
  )
}

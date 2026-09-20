/* eslint-disable react-hooks/set-state-in-effect */
/**
 * ALPHIX V2 — NotificationBell
 * Cloche avec badge unread + dropdown + mark-as-read.
 * Responsive: desktop dropdown anchored, mobile full-width sheet.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { NotificationApi } from '../../api/NotificationApi'
import { normalizeApiList } from '../../utils/academic'
import { useAuth } from '../../hooks/useAuth'
import IconButton from '../ui/IconButton'

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 2a5 5 0 0 0-5 5v3l-1.3 1.3A.7.7 0 0 0 4.2 12.5h11.6a.7.7 0 0 0 .5-1.2L15 10V7a5 5 0 0 0-5-5z" />
    <path d="M8 14.7a2 2 0 0 0 4 0" />
  </svg>
)

export default function NotificationBell() {
  const { isAuthenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const panelRef = useRef(null)
  const btnRef = useRef(null)

  const fetchUnread = useCallback(async (signal) => {
    if (!isAuthenticated) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await NotificationApi.getMyUnread()
      if (signal?.aborted) return
      const list = normalizeApiList(res)
      setItems(Array.isArray(list) ? list : [])
    } catch (e) {
      if (!signal?.aborted) {
        // fallback to /me then filter
        try {
          const res2 = await NotificationApi.getMe()
          const list2 = normalizeApiList(res2).filter((n) => !n.read_at)
          if (!signal?.aborted) setItems(list2)
        } catch {
          if (!signal?.aborted) setError(e?.message || 'Erreur')
        }
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const ctrl = new AbortController()
    fetchUnread(ctrl.signal)
    // poll every 30s while authenticated
    const id = isAuthenticated ? setInterval(() => fetchUnread(), 30000) : null
    return () => {
      ctrl.abort()
      if (id) clearInterval(id)
    }
  }, [fetchUnread, isAuthenticated, user?.id])

  // close on outside / escape
  useEffect(() => {
    if (!open) return undefined
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    // refresh on open
    const c = new AbortController()
    fetchUnread(c.signal)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      c.abort()
    }
  }, [open, fetchUnread])

  const unreadCount = items.length

  const handleMarkRead = async (id) => {
    try {
      await NotificationApi.markAsRead(id)
      setItems((prev) => prev.filter((n) => String(n.id) !== String(id)))
    } catch {
      // optimistic already handled? keep
    }
  }

  const handleMarkAllRead = async () => {
    const ids = items.map((n) => n.id)
    for (const id of ids) {
      try { await NotificationApi.markAsRead(id) } catch { /* ignore */ }
    }
    setItems([])
  }

  if (!isAuthenticated) {
    return (
      <IconButton
        icon={<BellIcon />}
        label="Notifications"
        badge={0}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      />
    )
  }

  return (
    <div className="ax-notif" style={{ position: 'relative' }}>
      <span ref={btnRef} style={{ display: 'inline-block' }}>
        <IconButton
          icon={<BellIcon />}
          label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : 'Notifications'}
          badge={unreadCount > 99 ? '99+' : unreadCount}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="notif-panel"
        />
      </span>

      {open && (
        <div
          id="notif-panel"
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="ax-card ax-notif__panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 'min(92vw, 380px)',
            maxHeight: 'min(70vh, 420px)',
            overflow: 'auto',
            zIndex: 50,
            padding: 0,
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--ax-border, #e5e7eb)' }}>
            <strong style={{ fontSize: 'var(--ax-text-sm)' }}>Notifications</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span aria-live="polite" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-secondary)' }}>{unreadCount} non lue{unreadCount !== 1 ? 's' : ''}</span>
              {unreadCount > 0 && (
                <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={handleMarkAllRead}>Tout marquer lu</button>
              )}
              <button type="button" className="ax-icon-btn ax-icon-btn--sm" aria-label="Fermer" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {loading && <p style={{ padding: 14, color: 'var(--ax-text-secondary)' }}>Chargement…</p>}
          {error && !loading && <p role="alert" style={{ padding: 14, color: '#b91c1c' }}>{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p style={{ padding: 14, color: 'var(--ax-text-secondary)', fontSize: 'var(--ax-text-sm)' }}>Aucune notification non lue.</p>
          )}
          {!loading && items.length > 0 && (
            <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((n) => (
                <li key={n.id} style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ marginTop: 2 }}>🔔</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--ax-text-sm)', lineHeight: 1.3 }}>{n.title || 'Notification'}</div>
                    {(n.data?.body || n.data?.message) && (
                      <div style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.data.body || n.data.message}</div>
                    )}
                    <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-tertiary)', marginTop: 6 }}>{n.sent_at || n.created_at ? new Date(n.sent_at || n.created_at).toLocaleString('fr-FR') : ''}{n.type ? ` • ${n.type}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    className="ax-btn ax-btn--ghost ax-btn--sm"
                    onClick={() => handleMarkRead(n.id)}
                    aria-label={`Marquer "${n.title || 'notification'}" comme lue`}
                    style={{ flexShrink: 0 }}
                  >
                    Lu
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ padding: '10px 14px', textAlign: 'right' }}>
            <button type="button" className="ax-btn ax-btn--outline ax-btn--sm" onClick={() => setOpen(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}

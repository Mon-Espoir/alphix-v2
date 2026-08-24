/**
 * Tests de fumée — ALPHIX V2 Phase 1B (infrastructure React)
 * Fichier TEMPORAIRE (dotfile), supprimé après exécution.
 *
 * Stratégie :
 *   - chargement des modules du projet via Vite SSR (`ssrLoadModule`) :
 *     gère nativement JSX, résolutions sans extension, import.meta.env ;
 *   - stores Zustand testés en isolation ;
 *   - arbre complet rendu en SSR via createMemoryRouter + renderToString
 *     (les effets ne tournent pas côté serveur -> rendu déterministe).
 */
import assert from 'node:assert/strict'
import { renderToString } from 'react-dom/server'
import React from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { createServer } from 'vite'

let passed = 0
let failed = 0
const failures = []

function check(label, fn) {
  try {
    fn()
    passed += 1
    console.log(`  PASS  ${label}`)
  } catch (err) {
    failed += 1
    failures.push({ label, err })
    console.log(`  FAIL  ${label}\n        ${err.message}`)
  }
}

async function checkAsync(label, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  PASS  ${label}`)
  } catch (err) {
    failed += 1
    failures.push({ label, err })
    console.log(`  FAIL  ${label}\n        ${err.message}`)
  }
}

// --- Serveur Vite SSR --------------------------------------------------------
const vite = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

const load = (path) => vite.ssrLoadModule(path)

const { useAuthStore, authStore } = await load('/src/store/authStore.js')
const { useUiStore } = await load('/src/store/uiStore.js')
const { useNotificationStore } = await load('/src/store/notificationStore.js')
const { useLoadingStore, selectIsGlobalLoading } = await load('/src/store/loadingStore.js')
const { AUTH_STATUS } = await load('/src/constants/auth.js')
const { ROUTE_PATHS } = await load('/src/constants/routes.js')
const { API_ENDPOINTS } = await load('/src/constants/endpoints.js')
const { routeConfig } = await load('/src/app/router.jsx')
const { default: AuthProvider } = await load('/src/context/AuthProvider.jsx')
const { AuthContext } = await load('/src/context/AuthContext.jsx')
const { default: ErrorBoundary } = await load('/src/components/feedback/ErrorBoundary.jsx')

function resetStores() {
  useAuthStore.setState({ user: null, status: AUTH_STATUS.IDLE })
  useUiStore.setState({ theme: 'system', isSidebarOpen: false })
  useNotificationStore.setState({ notifications: [] })
  useLoadingStore.setState({ pendingCount: 0 })
}

/** Rend SSR d'une route : ErrorBoundary > AuthProvider > MemoryRouter(routeConfig). */
function renderRoute(path) {
  const memRouter = createMemoryRouter(routeConfig, { initialEntries: [path] })
  return renderToString(
    React.createElement(
      ErrorBoundary,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(RouterProvider, { router: memRouter }),
      ),
    ),
  )
}

console.log('\n== 1. Constantes ==')
check('Chemins de routage', () => {
  assert.deepEqual({ ...ROUTE_PATHS }, { HOME: '/', LOGIN: '/login', DASHBOARD: '/dashboard' })
})
check('Endpoints auth alignés backend (/api/v1)', () => {
  assert.equal(API_ENDPOINTS.AUTH.LOGIN, '/login')
  assert.equal(API_ENDPOINTS.AUTH.LOGOUT, '/logout')
  assert.equal(API_ENDPOINTS.AUTH.ME, '/me')
})

console.log('\n== 2. Stores Zustand ==')
check('authStore : setUser/setStatus/clearAuth', () => {
  resetStores()
  useAuthStore.getState().setUser({ id: 1, name: 'Alpha' })
  useAuthStore.getState().setStatus(AUTH_STATUS.AUTHENTICATED)
  assert.equal(useAuthStore.getState().user.name, 'Alpha')
  assert.equal(useAuthStore.getState().status, AUTH_STATUS.AUTHENTICATED)
  useAuthStore.getState().clearAuth()
  assert.equal(useAuthStore.getState().user, null)
  assert.equal(useAuthStore.getState().status, AUTH_STATUS.UNAUTHENTICATED)
})
check('authStore : accès impératif exposé', () => {
  assert.equal(typeof authStore.getState, 'function')
  assert.equal(typeof authStore.subscribe, 'function')
})
check('uiStore : thème + sidebar', () => {
  resetStores()
  useUiStore.getState().setTheme('dark')
  useUiStore.getState().toggleSidebar()
  assert.equal(useUiStore.getState().theme, 'dark')
  assert.equal(useUiStore.getState().isSidebarOpen, true)
  useUiStore.getState().closeSidebar()
  assert.equal(useUiStore.getState().isSidebarOpen, false)
})
check('notificationStore : notify/dismiss/clearAll (dismiss idempotent)', () => {
  resetStores()
  const s = useNotificationStore.getState()
  const id1 = s.notify({ type: 'error', message: 'Erreur réseau' })
  const id2 = s.notify({ message: 'Info', duration: 1000 })
  assert.notEqual(id1, id2)
  let list = useNotificationStore.getState().notifications
  assert.equal(list.length, 2)
  useNotificationStore.getState().dismiss(id1)
  list = useNotificationStore.getState().notifications
  assert.equal(list.length, 1)
  assert.equal(list[0].id, id2)
  useNotificationStore.getState().clearAll()
  assert.equal(useNotificationStore.getState().notifications.length, 0)
  useNotificationStore.getState().dismiss(id1) // aucune exception attendue
})
check('loadingStore : compteur concurrent borné à zéro', () => {
  resetStores()
  const s = useLoadingStore.getState()
  s.startLoading(); s.startLoading()
  assert.equal(selectIsGlobalLoading(useLoadingStore.getState()), true)
  assert.equal(useLoadingStore.getState().pendingCount, 2)
  s.stopLoading()
  assert.equal(useLoadingStore.getState().pendingCount, 1)
  s.stopLoading(); s.stopLoading()
  assert.equal(useLoadingStore.getState().pendingCount, 0)
  assert.equal(selectIsGlobalLoading(useLoadingStore.getState()), false)
})

console.log('\n== 3. Rendu SSR arbre complet (providers + router + layouts + pages) ==')
await checkAsync('route "/" : GuestLayout + HomePage', async () => {
  const html = renderRoute('/')
  assert.ok(html.includes('ALPHIX V2'), 'header manquant')
  assert.ok(html.includes('Accueil'), 'contenu HomePage manquant')
  assert.ok(html.includes('placeholder'), 'marqueur placeholder manquant')
})
await checkAsync('route "/login" accessible en invité (SSR)', async () => {
  const html = renderRoute('/login')
  assert.ok(html.includes('Connexion'), 'LoginPage non rendue')
})
await checkAsync('route "/dashboard" protégée -> LoadingScreen au boot (SSR)', async () => {
  const html = renderRoute('/dashboard')
  assert.ok(html.includes('loading-screen'), 'LoadingScreen attendu pendant la résolution de session')
})
await checkAsync('route inconnue -> NotFound 404', async () => {
  const html = renderRoute('/route-inexistante')
  assert.ok(html.includes('404'), 'page 404 attendue')
  assert.ok(html.includes('Page introuvable'))
})

await checkAsync('AuthProvider expose le contrat useAuth complet', async () => {
  let captured = null

  function ContextCapture() {
    captured = React.useContext(AuthContext)
    return null
  }

  renderToString(React.createElement(AuthProvider, null, React.createElement(ContextCapture)))

  assert.ok(captured, 'contexte non fourni')
  assert.equal(captured.user, null)
  assert.ok(Object.values(AUTH_STATUS).includes(captured.status))
  assert.equal(captured.loading, true) // boot non exécuté en SSR
  assert.equal(captured.isAuthenticated, false)
  assert.equal(typeof captured.login, 'function')
  assert.equal(typeof captured.logout, 'function')
  assert.equal(typeof captured.refreshUser, 'function')
})

await checkAsync('useAuth hors Provider -> erreur explicite', async () => {
  const { useAuth } = await load('/src/hooks/useAuth.js')

  function Consumer() {
    try {
      useAuth()
      return 'no-error'
    } catch (e) {
      return e.message.includes('AuthProvider') ? 'threw-correctly' : `wrong: ${e.message}`
    }
  }
  const html = renderToString(React.createElement(Consumer))
  assert.equal(html, 'threw-correctly')
})

resetStores()
await vite.close()

console.log(`\n===== RÉSULTAT : ${passed} réussis / ${failed} échoués =====`)
if (failures.length > 0) {
  for (const f of failures) console.log(` - ${f.label}: ${f.err.message}`)
  process.exitCode = 1
}

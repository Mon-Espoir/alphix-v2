import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GARDE-FOU PERMANENT (stabilite APK).
 * Un build release (`vite build`) pointe TOUJOURS la production : si
 * VITE_API_BASE_URL designe localhost / une IP privee / une valeur vide,
 * le build ECHOUE bruyamment au lieu de produire une APK cassee qui ne se
 * connecte a rien. Aucune manipulation manuelle d'URL avant compilation.
 */
function permanentApiGuard() {
  return {
    name: 'alphix-permanent-api-guard',
    configResolved(config) {
      if (config.command !== 'build') return
      const raw = String(config.env?.VITE_API_BASE_URL ?? '').trim()
      const bad =
        raw === '' ||
        /localhost/i.test(raw) ||
        /127\.0\.0\.1/.test(raw) ||
        /192\.168\.\d+\.\d+/.test(raw) ||
        /10\.\d+\.\d+\.\d+/.test(raw)
      if (bad) {
        throw new Error(
          `[ALPHIX] Build release REFUSE : VITE_API_BASE_URL invalide (« ${raw || 'vide'} »). ` +
            `L'APK doit pointer l'API permanente (voir frontend/.env.production).`,
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [permanentApiGuard(), react()],
  build: {
    chunkSizeWarningLimit: 350,
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react/') || id.includes('react-dom') || id.includes('zustand') || id.includes('axios')) return 'vendor'
            return 'vendor'
          }
          if (id.includes('src/pages/admin')) return 'admin'
          if (id.includes('src/pages/automation') || id.includes('src/features/automation')) return 'automation'
          if (id.includes('src/pages/upload') || id.includes('src/features/upload')) return 'upload'
          if (id.includes('src/pages/documents') || id.includes('src/components/documents')) return 'documents'
        },
      },
    },
  },
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  },
})

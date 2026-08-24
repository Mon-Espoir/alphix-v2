import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Runtime JSX automatique : evite "React is not defined" pour les modules
  // evaluees au chargement (ex. router.jsx) dans l'environnement de test.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    environment: 'jsdom',
  },
})

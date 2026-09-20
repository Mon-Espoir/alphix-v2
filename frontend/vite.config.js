import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

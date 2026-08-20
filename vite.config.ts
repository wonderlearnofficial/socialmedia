/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync } from 'node:fs'

/**
 * GitHub Pages has no SPA rewrite: a deep link like /share/xyz is looked up as a
 * real file. Serving a copy of index.html as 404.html makes Pages hand the app
 * back for those paths, with the URL preserved so the router can read it.
 */
function spaFallback() {
  return {
    name: 'spa-404-fallback',
    apply: 'build' as const,
    closeBundle() {
      try {
        copyFileSync('dist/index.html', 'dist/404.html')
      } catch {
        // index.html is always emitted; ignore if a custom outDir moved it
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('@fullcalendar')) return 'calendar'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('gsap')) {
            return 'motion'
          }
          if (id.includes('@fontsource')) return 'fonts'
          return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

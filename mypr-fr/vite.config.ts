import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mypr.png'],
      manifest: {
        name: 'MyPR - Tu Entrenador Personal',
        short_name: 'MyPR',
        description: 'Registro de entrenos, series y récords personales',
        theme_color: '#171c2a',
        background_color: '#171c2a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'mypr.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'mypr.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'mypr.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cachea imágenes, fuentes, scripts y estilos para uso offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Aumentar límite de tamaño para caché si es necesario
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
      }
    })
  ],
  build: {
    sourcemap: true,
    minify: 'terser',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'chart': ['chart.js', 'vue-chartjs']
        }
      }
    }
  }
})
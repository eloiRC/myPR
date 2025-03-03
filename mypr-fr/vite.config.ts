import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Genera sourcemaps para una mejor depuración
    sourcemap: true,
    // Optimiza el tamaño del bundle
    minify: 'terser',
    // Configuración para Cloudflare Pages
    target: 'esnext',
    // Divide el código en chunks más pequeños
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'chart': ['chart.js', 'vue-chartjs']
        }
      }
    }
  }
})

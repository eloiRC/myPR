import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Tipografías alojadas en la app (solo subconjunto latino, incluye tildes y ñ):
// se precachean con el PWA para que en el gimnasio sin cobertura no caiga a una fuente del sistema
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
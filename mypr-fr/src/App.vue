<script setup lang="ts">
// No necesitamos importar componentes específicos aquí
// ya que el router se encargará de mostrar el componente correcto
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import Footer from './components/Footer.vue';

// Obtener la ruta actual
const route = useRoute();

// Comprobar si estamos en la página de login
const isLoginPage = computed(() => route.path === '/login');

onMounted(() => {
  // Aplicar la clase dark al elemento html para activar el modo oscuro por defecto
  document.documentElement.classList.add('dark');
});
</script>

<template>
  <div class="app-container" :class="{ 'with-footer': !isLoginPage }">
    <router-view />
    <Footer v-if="!isLoginPage" />
  </div>
</template>

<style>
/* Algunos estilos globales */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.with-footer {
  padding-bottom: 60px; /* Espacio para el footer */
}

/* Estilos para scrollbar personalizados para tema oscuro */
::-webkit-scrollbar {
  width: 10px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--accent-tertiary);
}

/* Estilos para selección de texto */
::selection {
  background-color: rgba(25, 86, 200, 0.3); /* cobalt_blue-500 con opacidad */
  color: var(--text-primary);
}

/* Variables CSS para acceder a los colores desde cualquier componente */
:root {
  --color-cobalt-blue: #1956C8;
  --color-razzmatazz: #db3069;
  --color-naples-yellow: #f5d547;
  --color-beige: #ebebd3;
  --color-delft-blue: #3a4569;

  /* Tema oscuro por defecto */
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --border: #333333;
  --accent-primary: var(--color-cobalt-blue);
  --accent-secondary: var(--color-razzmatazz);
  --accent-tertiary: var(--color-naples-yellow);
  --error: #ff5252;
}

/* Tema claro (no activado por defecto) */
.light {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #121212;
  --text-secondary: #666666;
  --border: #dddddd;
  --accent-primary: var(--color-cobalt-blue);
  --accent-secondary: var(--color-razzmatazz);
  --accent-tertiary: var(--color-naples-yellow);
  --error: #ff5252;
}
</style>

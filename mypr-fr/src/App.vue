<script setup lang="ts">
// No necesitamos importar componentes específicos aquí
// ya que el router se encargará de mostrar el componente correcto
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Footer from './components/Footer.vue';

// Obtener la ruta actual
const route = useRoute();
function nonFooter(){
  if(route.path === '/register' || route.path === '/login'){
    return true
  }else{
    return false
  }
}




onMounted(() => {
  // Aplicar la clase dark al elemento html para activar el modo oscuro por defecto
  document.documentElement.classList.add('dark');
});


</script>

<template>
  <div class="app-container" :class="{ 'with-footer': !nonFooter()}">
    <router-view />
    <Footer v-show="!nonFooter()" />
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
  --color-cobalt-blue: #0F8B8D;
  --color-cobalt-blue-dark: #0a4f50;
  --color-razzmatazz: #FF8D67;
  --color-sandy-brown: #B91372;
  --color-naples-yellow: #143642;
  --color-beige: #DAD2D8;
  --color-delft-blue: #3a4569;

  /* Tema oscuro por defecto */
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --border: #333333;
  --accent-primary: var(--color-cobalt-blue);
  --accent-primary-dark:var(--color-cobalt-blue-dark);
  --accent-secondary: var(--color-razzmatazz);
  --accent-tertiary: var(--color-naples-yellow);  
  --accent-quaternary: var(--color-sandy-brown);
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

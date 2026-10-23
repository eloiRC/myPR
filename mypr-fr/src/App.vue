<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import DeshacerToast from './components/DeshacerToast.vue';
import { useAuthStore } from './stores/auth';
import { useRestTimer } from './composables/useRestTimer';

const route = useRoute();
const auth = useAuthStore();
const restTimer = useRestTimer();

function hideNav() {
  return route.path === '/register' || route.path === '/login';
}

onMounted(() => {
  document.documentElement.classList.add('dark');
});

// Ajustes del temporizador de descanso: se leen del servidor al abrir la app y al iniciar sesión
watch(() => auth.isAuthenticated, (ok) => { if (ok) restTimer.cargarDesdeServidor(); }, { immediate: true });
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <router-view />
    </main>
    <BottomNav v-if="!hideNav()" />
    <DeshacerToast />
  </div>
</template>

<style>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.app-main {
  flex: 1 0 auto;
  padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--n4);
  border-radius: var(--radius-sm);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}


</style>

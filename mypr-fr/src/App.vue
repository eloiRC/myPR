<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Footer from './components/Footer.vue';

const route = useRoute();

function hideFooter() {
  return route.path === '/register' || route.path === '/login';
}

onMounted(() => {
  document.documentElement.classList.add('dark');
});
</script>

<template>
  <div class="app-shell">
    <main class="app-main">
      <router-view />
    </main>
    <Footer v-if="!hideFooter()" />
  </div>
</template>

<style>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(45, 212, 191, 0.08), transparent),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(249, 115, 22, 0.05), transparent);
  color: var(--text-primary);
}

.app-main {
  flex: 1 0 auto;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

::selection {
  background-color: rgba(45, 212, 191, 0.35);
  color: var(--text-primary);
}
</style>

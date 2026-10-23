<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const items = [
  { to: '/entrenos', label: 'Entrenos', icon: '🏋️', prefijos: ['/entrenos', '/entreno/'] },
  { to: '/ejercicios', label: 'Ejercicios', icon: '📚', prefijos: ['/ejercicios', '/ejercicio/'] },
  { to: '/user', label: 'Perfil', icon: '👤', prefijos: ['/user'] },
];

const activo = computed(() =>
  items.find(i => i.prefijos.some(p => route.path === p || route.path.startsWith(p)))?.to
);
</script>

<template>
  <nav class="bottom-nav" aria-label="Navegación principal">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-item"
      :class="{ active: activo === item.to }"
      :aria-current="activo === item.to ? 'page' : undefined"
    >
      <span class="bottom-nav-icon" aria-hidden="true">{{ item.icon }}</span>
      <span class="bottom-nav-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 900;
  display: flex;
  height: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  min-height: var(--touch-min);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 700;
  transition: color 0.2s;
}

.bottom-nav-item:hover {
  color: var(--text-primary);
}

.bottom-nav-item.active {
  color: var(--accent-primary-hover);
}

.bottom-nav-icon {
  font-size: 1.25rem;
  line-height: 1;
}
</style>

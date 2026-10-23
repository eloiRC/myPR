<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Dumbbell, ListChecks, MessageSquareText, UserRound } from 'lucide-vue-next';

const route = useRoute();

// "Entrenador" abre el chat del entreno en curso (el último, o uno nuevo si no hay)
const items = [
  { to: '/entrenos', label: 'Entrenos', icon: Dumbbell, prefijos: ['/entrenos', '/entreno/'] },
  { to: '/ejercicios', label: 'Ejercicios', icon: ListChecks, prefijos: ['/ejercicios', '/ejercicio/'] },
  { to: '/entreno/actual?chat=1', label: 'Entrenador', icon: MessageSquareText, prefijos: [] as string[] },
  { to: '/user', label: 'Perfil', icon: UserRound, prefijos: ['/user'] },
];

const activo = computed(() => {
  if (route.query.chat === '1') return '/entreno/actual?chat=1';
  return items.find(i => i.prefijos.some(p => route.path === p || route.path.startsWith(p)))?.to;
});
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
      <component :is="item.icon" class="bottom-nav-icon" :size="22" :stroke-width="2" aria-hidden="true" />
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
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--n0);
  border-top: 1px solid var(--n3);
}
.bottom-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: var(--touch-min);
  color: var(--n6);
  text-decoration: none;
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.bottom-nav-item:hover { color: var(--n8); }
/* Activo: ámbar LED y una barra en el borde superior, como el piloto encendido de una consola */
.bottom-nav-item.active { color: var(--led-amber); }
.bottom-nav-item.active::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 28%;
  right: 28%;
  height: 3px;
  background: var(--led-amber);
}
</style>

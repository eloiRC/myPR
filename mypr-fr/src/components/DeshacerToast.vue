<script setup lang="ts">
import { useDeshacer } from '../composables/useDeshacer';

const { actual, deshacer } = useDeshacer();
</script>

<template>
  <Transition name="deshacer">
    <div v-if="actual" class="deshacer-toast" role="status" aria-live="polite">
      <span class="deshacer-msg">{{ actual.mensaje }}</span>
      <button type="button" class="deshacer-btn" @click="deshacer">Deshacer</button>
    </div>
  </Transition>
</template>

<style scoped>
/* Encima de la barra de navegación y, si corre un descanso, del reloj acoplado */
.deshacer-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--bottom-nav-h, 0px) + var(--rest-dock-h, 0px) + env(safe-area-inset-bottom) + 0.75rem);
  width: calc(100% - 1.5rem);
  max-width: 26rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0.25rem 0.25rem 1rem;
  background: var(--n3);
  border: 1px solid var(--n5);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  color: var(--n8);
  z-index: 10000;
}

.deshacer-msg {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.deshacer-btn {
  min-height: var(--touch-min);
  padding: 0 1.1rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--led-amber);
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.deshacer-btn:hover {
  background: var(--n4);
}

.deshacer-enter-active,
.deshacer-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.deshacer-enter-from,
.deshacer-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.75rem);
}
</style>

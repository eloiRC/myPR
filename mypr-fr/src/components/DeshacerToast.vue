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
.deshacer-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--bottom-nav-h, 0px) + max(0.75rem, env(safe-area-inset-bottom)));
  width: calc(100% - 2rem);
  max-width: 24rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  z-index: 10000;
}

.deshacer-btn {
  min-height: var(--touch-min);
  padding: 0 1rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent-primary-hover);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.deshacer-btn:hover {
  background: var(--bg-tertiary);
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

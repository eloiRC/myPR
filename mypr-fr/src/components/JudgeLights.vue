<script setup lang="ts">
// Los tres pilotos de jueces de una competición de fuerza: blanco = levantamiento válido.
// En la app se encienden en secuencia cuando el usuario bate un récord personal.
interface Props {
  /** Cuántos pilotos encendidos (0-3) */
  lit?: number;
  /** Encender en secuencia (animado) al pasar a 3 */
  secuencia?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}
withDefaults(defineProps<Props>(), { lit: 0, secuencia: false, size: 'md', label: undefined });
</script>

<template>
  <span class="judges" :class="[`judges--${size}`, { 'judges--seq': secuencia }]" role="img" :aria-label="label ?? `${lit} de 3 luces blancas`">
    <span v-for="i in 3" :key="i" class="judge" :class="{ on: i <= lit }" :style="{ '--i': i - 1 }"></span>
  </span>
</template>

<style scoped>
.judges { display: inline-flex; gap: 0.35em; align-items: center; }
.judge {
  width: 0.7em;
  height: 0.7em;
  border-radius: 50%;
  background: var(--n2);
  box-shadow: inset 0 0 0 1px var(--n4);
}
.judge.on { background: var(--judge-white); box-shadow: inset 0 0 0 1px var(--judge-white); }
.judges--sm { font-size: 0.75rem; }
.judges--md { font-size: 1rem; }
.judges--lg { font-size: 1.75rem; }
.judges--seq .judge.on { animation: judge-on 0.28s steps(1, end) both; animation-delay: calc(var(--i) * 0.22s); }
@keyframes judge-on {
  from { background: var(--n2); box-shadow: inset 0 0 0 1px var(--n4); }
  to { background: var(--judge-white); box-shadow: inset 0 0 0 1px var(--judge-white); }
}
@media (prefers-reduced-motion: reduce) {
  .judges--seq .judge.on { animation: none; }
}
</style>

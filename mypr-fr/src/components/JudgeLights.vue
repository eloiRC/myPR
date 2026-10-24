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
  /** Rótulo corto bajo las luces; si se indica, se dibujan alojadas en una caja hundida */
  rotulo?: string;
}
withDefaults(defineProps<Props>(), { lit: 0, secuencia: false, size: 'md', label: undefined, rotulo: undefined });
</script>

<template>
  <span v-if="rotulo" class="caja" :class="{ 'caja--on': lit > 0 }" role="img" :aria-label="label ?? `${rotulo}: ${lit} de 3 luces blancas`">
    <span class="judges" :class="[`judges--${size}`, { 'judges--seq': secuencia }]" aria-hidden="true">
      <span v-for="i in 3" :key="i" class="judge" :class="{ on: i <= lit }" :style="{ '--i': i - 1 }"></span>
    </span>
    <span class="caja-rotulo" aria-hidden="true">{{ rotulo }}</span>
  </span>
  <span v-else class="judges" :class="[`judges--${size}`, { 'judges--seq': secuencia }]" role="img" :aria-label="label ?? `${lit} de 3 luces blancas`">
    <span v-for="i in 3" :key="i" class="judge" :class="{ on: i <= lit }" :style="{ '--i': i - 1 }"></span>
  </span>
</template>

<style scoped>
/* Alojamiento hundido con rótulo: se lee como piloto de marcador, no como menú */
.caja {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0.65rem 0.35rem;
  background: var(--n0);
  border: 1px solid var(--n3);
  border-radius: var(--radius-sm);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
}
.caja-rotulo {
  font-family: var(--font-display);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--n5);
}
.caja--on .caja-rotulo { color: var(--n7); }
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

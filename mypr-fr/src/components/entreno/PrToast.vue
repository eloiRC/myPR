<script setup lang="ts">
// Aviso de récord personal: tres pilotos de jueces en blanco que se encienden en secuencia
// y los dígitos de la serie parpadean dos veces (sin movimiento si el usuario lo pide).
import SegDisplay from '../SegDisplay.vue';
import JudgeLights from '../JudgeLights.vue';
import { kgDisplay } from '../../utils/segmentos';

defineProps<{ open: boolean; ejercicio: string; kg: number; reps: number }>();
</script>

<template>
  <!-- Región viva siempre presente para que el lector de pantalla anuncie el récord -->
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    <template v-if="open">Nuevo récord personal. {{ ejercicio }}, {{ kgDisplay(kg).replace('.', ',') }} kilos por {{ reps }}.</template>
  </div>
  <Transition name="pr">
    <div v-if="open" class="pr-toast" aria-hidden="true">
      <JudgeLights :lit="3" secuencia size="lg" label="Tres luces blancas" />
      <div class="pr-texto">
        <span class="pr-rotulo">Nuevo récord personal</span>
        <span class="pr-ejercicio">{{ ejercicio }}</span>
      </div>
      <div class="pr-cifras">
        <SegDisplay :value="kgDisplay(kg)" tone="white" class="pr-seg" />
        <span class="pr-por">×</span>
        <SegDisplay :value="reps" tone="white" class="pr-seg" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.pr-toast {
  position: fixed;
  top: max(0.75rem, env(safe-area-inset-top));
  left: 0.75rem;
  right: 0.75rem;
  max-width: 28rem;
  margin: 0 auto;
  z-index: 3000;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas: 'luces texto' 'cifras cifras';
  align-items: center;
  gap: 0.6rem 0.9rem;
  padding: 0.8rem 1rem;
  background: var(--n2);
  border: 1px solid var(--judge-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.pr-toast > :first-child { grid-area: luces; }
.pr-texto { grid-area: texto; display: flex; flex-direction: column; min-width: 0; }
.pr-rotulo {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--n7);
}
.pr-ejercicio {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--judge-white);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pr-cifras { grid-area: cifras; display: flex; align-items: center; justify-content: center; gap: 0.9rem; animation: pr-parpadeo 0.9s steps(1, end) 0.7s 1 both; }
.pr-seg { font-size: 3rem; }
.pr-por { font-family: var(--font-display); font-size: 1.6rem; color: var(--n6); }

/* Dos parpadeos tras encenderse las luces */
@keyframes pr-parpadeo {
  0%, 50% { opacity: 1; }
  12.5%, 62.5% { opacity: 0.15; }
  25%, 75%, 100% { opacity: 1; }
}
.pr-enter-active, .pr-leave-active { transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
.pr-enter-from, .pr-leave-to { opacity: 0; transform: translateY(-0.75rem); }
@media (prefers-reduced-motion: reduce) {
  .pr-cifras { animation: none; }
  .pr-enter-active, .pr-leave-active { transition: none; }
}
</style>

<script setup lang="ts">
// Aviso de récord personal: tres pilotos de jueces en blanco que se encienden en secuencia
// y la marca parpadea dos veces (sin movimiento si el usuario lo pide).
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
      <JudgeLights :lit="3" secuencia size="sm" label="Tres luces blancas" />
      <div class="pr-texto">
        <span class="pr-rotulo">Nuevo récord</span>
        <span class="pr-ejercicio">{{ ejercicio }}</span>
      </div>
      <span class="pr-cifras">{{ kgDisplay(kg).replace('.', ',') }}<small>kg</small> × {{ reps }}</span>
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
/* Tira compacta arriba: luces, ejercicio y marca; no bloquea toques */
.pr-toast {
  position: fixed;
  top: max(0.5rem, env(safe-area-inset-top));
  left: 0.75rem;
  right: 0.75rem;
  max-width: 28rem;
  margin: 0 auto;
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.85rem;
  background: var(--n2);
  border: 1px solid var(--judge-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  pointer-events: none;
}
.pr-texto { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.pr-rotulo {
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--n6);
}
.pr-ejercicio {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--n8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pr-cifras {
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--judge-white);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  animation: pr-parpadeo 0.9s steps(1, end) 0.7s 1 both;
}
.pr-cifras small { margin: 0 0.2rem 0 0.15rem; font-size: 0.85rem; color: var(--n7); }

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

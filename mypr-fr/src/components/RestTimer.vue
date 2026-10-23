<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Pause, Play, X } from 'lucide-vue-next';
import SegDisplay from './SegDisplay.vue';
import {
  useRestTimer, restanteMs, progresoEstado, estaPausado, pausarEstado,
  reanudarEstado, ajustarEstado, formatearMmSs, PASO_AJUSTE_SEG,
} from '../composables/useRestTimer';

const { habilitado, estado, ciclo, cerrar } = useRestTimer();

const ahora = ref(Date.now());
const terminado = ref(false);
const anuncio = ref('');
let intervalo: ReturnType<typeof setInterval> | null = null;
let tOcultar: ReturnType<typeof setTimeout> | null = null;
let audioCtx: AudioContext | null = null;

const restante = computed(() => (estado.value ? restanteMs(estado.value, ahora.value) : 0));
const pausado = computed(() => (estado.value ? estaPausado(estado.value) : false));
const progreso = computed(() => (estado.value ? progresoEstado(estado.value, ahora.value) : 0));
const texto = computed(() => formatearMmSs(restante.value));
const visible = computed(() => habilitado.value && estado.value !== null);
// Altura del reloj acoplado, para que otros avisos fijos (Deshacer) se coloquen encima
watch(visible, (v) => {
  document.documentElement.style.setProperty('--rest-dock-h', v ? '3.6rem' : '0px');
}, { immediate: true });
// La barra mide lo que queda del descanso: su longitud es la duración
const fraccionRestante = computed(() => (terminado.value ? 0 : 1 - progreso.value));

const pitar = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    const ctx = audioCtx as AudioContext;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    [0, 0.25].forEach((off) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0 + off);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + off + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + off);
      osc.stop(t0 + off + 0.2);
    });
  } catch {
    // Audio no disponible o bloqueado: se ignora
  }
};

const finalizar = () => {
  if (terminado.value) return;
  terminado.value = true;
  anuncio.value = '¡A por la siguiente serie!';
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibración */ }
  pitar();
  tOcultar = setTimeout(() => cerrar(), 4000);
};

const tick = () => {
  ahora.value = Date.now();
  if (estado.value && !terminado.value && !pausado.value && restante.value <= 0) finalizar();
};

const parar = () => {
  if (intervalo) { clearInterval(intervalo); intervalo = null; }
};
const arrancar = () => {
  parar();
  intervalo = setInterval(tick, 250);
};

// Inicio o reinicio: se limpia el estado de "terminado"
watch(ciclo, () => {
  if (tOcultar) { clearTimeout(tOcultar); tOcultar = null; }
  terminado.value = false;
  anuncio.value = '';
  tick();
});

// Intervalo solo mientras hay temporizador
watch(estado, (e) => {
  if (!e) {
    parar();
    if (tOcultar) { clearTimeout(tOcultar); tOcultar = null; }
    terminado.value = false;
    anuncio.value = '';
    return;
  }
  if (!intervalo) arrancar();
  tick();
});

// Recalcula al volver a la pestaña: el cálculo se basa en el timestamp objetivo
const onVisibilidad = () => { if (!document.hidden) tick(); };

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilidad);
  if (estado.value) { arrancar(); tick(); }
});
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilidad);
  document.documentElement.style.setProperty('--rest-dock-h', '0px');
  parar();
  if (tOcultar) clearTimeout(tOcultar);
  if (audioCtx) { void audioCtx.close().catch(() => {}); audioCtx = null; }
});

const ajustar = (seg: number) => {
  if (!estado.value || terminado.value) return;
  estado.value = ajustarEstado(estado.value, seg * 1000, Date.now());
  tick();
};
const alternarPausa = () => {
  if (!estado.value || terminado.value) return;
  const n = Date.now();
  estado.value = pausado.value ? reanudarEstado(estado.value, n) : pausarEstado(estado.value, n);
  tick();
};
</script>

<template>
  <!-- Región viva siempre presente: solo se anuncia el fin, no cada segundo -->
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ anuncio }}</div>

  <Transition name="rest-slide">
    <div
      v-if="visible"
      class="rest-timer"
      :class="{ done: terminado, paused: pausado }"
      role="group"
      aria-label="Temporizador de descanso"
    >
      <div class="rest-progress" aria-hidden="true">
        <div class="rest-progress-fill" :style="{ transform: `scaleX(${fraccionRestante})` }"></div>
      </div>

      <div class="rest-main">
        <div v-if="terminado" class="rest-done">A por la siguiente serie</div>
        <template v-else>
          <div class="rest-time">
            <SegDisplay :value="texto" :tone="pausado ? 'muted' : 'red'" :label="`Descanso, quedan ${texto}${pausado ? ', en pausa' : ''}`" class="rest-seg" />
          </div>
          <div class="rest-controls">
            <button type="button" class="rest-btn" aria-label="Restar 15 segundos" @click="ajustar(-PASO_AJUSTE_SEG)">−15</button>
            <button type="button" class="rest-btn" aria-label="Sumar 15 segundos" @click="ajustar(PASO_AJUSTE_SEG)">+15</button>
            <button type="button" class="rest-btn" :aria-label="pausado ? 'Reanudar descanso' : 'Pausar descanso'" @click="alternarPausa">
              <Play v-if="pausado" :size="20" :stroke-width="2.25" aria-hidden="true" />
              <Pause v-else :size="20" :stroke-width="2.25" aria-hidden="true" />
            </button>
          </div>
        </template>
        <button type="button" class="rest-btn rest-close" aria-label="Cerrar temporizador de descanso" @click="cerrar">
          <X :size="20" :stroke-width="2.25" aria-hidden="true" />
        </button>
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

/* Acoplado justo encima de la barra de navegación, a todo el ancho */
.rest-timer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom));
  z-index: 950;
  background: var(--n1);
  border-top: 1px solid var(--n4);
  box-shadow: var(--bevel), 0 -8px 20px rgba(0, 0, 0, 0.45);
}

.rest-progress { height: 6px; background: var(--n3); }
.rest-progress-fill {
  height: 100%;
  background: var(--led-red);
  transform-origin: left center;
  transition: transform 0.25s linear;
}
.rest-timer.paused .rest-progress-fill { background: var(--n6); }
.rest-timer.done .rest-progress-fill { background: var(--led-amber); }

.rest-main {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 44rem;
  margin: 0 auto;
  padding: 0.35rem 0.25rem 0.35rem 1rem;
  min-height: 3.5rem;
}

.rest-time { display: flex; align-items: center; }
.rest-seg { font-size: 2.1rem; }

.rest-controls { display: flex; margin-left: auto; }

.rest-done {
  flex: 1;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--led-amber);
}

.rest-btn {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.25rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--n7);
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.rest-btn:hover { background: var(--n3); color: var(--n8); }
.rest-btn:focus-visible { outline-offset: -3px; }

.rest-slide-enter-active,
.rest-slide-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.rest-slide-enter-from,
.rest-slide-leave-to { transform: translateY(100%); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .rest-slide-enter-active, .rest-slide-leave-active { transition: none; }
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
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
        <div class="rest-progress-fill" :style="{ transform: `scaleX(${terminado ? 1 : progreso})` }"></div>
      </div>

      <div class="rest-main">
        <div v-if="terminado" class="rest-done">¡A por la siguiente serie!</div>
        <template v-else>
          <div class="rest-time" aria-hidden="true">{{ texto }}</div>
          <span class="sr-only">Descanso, quedan {{ texto }}{{ pausado ? ', en pausa' : '' }}</span>
          <div class="rest-controls">
            <button type="button" class="rest-btn" aria-label="Restar 15 segundos" @click="ajustar(-PASO_AJUSTE_SEG)">−15</button>
            <button type="button" class="rest-btn" aria-label="Sumar 15 segundos" @click="ajustar(PASO_AJUSTE_SEG)">+15</button>
            <button type="button" class="rest-btn" :aria-label="pausado ? 'Reanudar descanso' : 'Pausar descanso'" @click="alternarPausa">
              <svg v-if="pausado" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            </button>
          </div>
        </template>
        <button type="button" class="rest-btn rest-close" aria-label="Cerrar temporizador de descanso" @click="cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
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

/* Deja libre el botón flotante del coach IA (56px + márgenes) a la derecha */
.rest-timer {
  position: fixed;
  left: max(0.75rem, env(safe-area-inset-left));
  right: calc(max(1rem, env(safe-area-inset-right)) + 56px + 0.5rem);
  bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 0.75rem);
  z-index: 999;
  background: var(--bg-secondary);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  font-family: inherit;
}

.rest-progress {
  height: 4px;
  background: var(--bg-tertiary);
}
.rest-progress-fill {
  height: 100%;
  background: var(--accent-primary);
  transform-origin: left center;
  transition: transform 0.25s linear;
}
.rest-timer.paused .rest-progress-fill { background: var(--text-muted); }
.rest-timer.done .rest-progress-fill { background: var(--pr); }

.rest-main {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.25rem 0.25rem 0.75rem;
  min-height: calc(var(--touch-min) + 0.5rem);
}

.rest-time {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  min-width: 4.2ch;
}
.rest-timer.paused .rest-time { color: var(--text-muted); }

.rest-controls {
  display: flex;
  margin-left: auto;
}

.rest-done {
  flex: 1;
  font-weight: 800;
  color: var(--pr);
  font-size: 1rem;
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
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}
.rest-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.rest-btn:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: -2px; }

.rest-slide-enter-active,
.rest-slide-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.rest-slide-enter-from,
.rest-slide-leave-to { transform: translateY(1rem); opacity: 0; }
</style>

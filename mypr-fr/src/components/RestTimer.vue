<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import SegDisplay from './SegDisplay.vue';
import {
  useRestTimer, restanteMs, progresoEstado, estaPausado, pausarEstado,
  reanudarEstado, ajustarEstado, formatearMmSs, PASO_AJUSTE_SEG,
} from '../composables/useRestTimer';

const { habilitado, estado, ciclo, iniciar, cerrar } = useRestTimer();

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
// La barra mide lo que queda del descanso: su longitud es la duración
const textoCelda = computed(() => (visible.value ? texto.value : '00:00'));
const tono = computed(() => (!visible.value || pausado.value ? 'muted' : 'amber') as 'muted' | 'amber');
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
  parar();
  if (tOcultar) clearTimeout(tOcultar);
  if (audioCtx) { void audioCtx.close().catch(() => {}); audioCtx = null; }
});

const ajustar = (seg: number) => {
  if (!estado.value || terminado.value) return;
  estado.value = ajustarEstado(estado.value, seg * 1000, Date.now());
  tick();
};
const pulsarCelda = () => {
  if (!visible.value) iniciar();
  else if (terminado.value) cerrar();
  else alternarPausa();
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

  <div
    v-if="habilitado"
    class="lectura"
    :class="{ viva: visible && !terminado && !pausado, done: terminado, paused: pausado }"
    role="group"
    aria-label="Temporizador de descanso"
  >
    <button
      type="button"
      class="principal"
      :aria-label="!visible ? 'Iniciar descanso' : terminado ? 'Cerrar descanso' : pausado ? `Descanso en pausa, quedan ${texto}. Reanudar` : `Descanso, quedan ${texto}. Pausar`"
      @click="pulsarCelda"
    >
      <span class="rotulo">{{ terminado ? 'A por la siguiente' : pausado ? 'Descanso · pausa' : 'Descanso' }}</span>
      <span class="valor"><SegDisplay :value="textoCelda" :tone="tono" aria-hidden="true" class="seg-valor" /></span>
    </button>
    <template v-if="visible && !terminado">
      <div class="ajustes">
        <button type="button" class="rest-btn" aria-label="Sumar 15 segundos" @click="ajustar(PASO_AJUSTE_SEG)">+15</button>
        <button type="button" class="rest-btn" aria-label="Restar 15 segundos" @click="ajustar(-PASO_AJUSTE_SEG)">−15</button>
      </div>
      <button type="button" class="cerrar" aria-label="Cerrar temporizador de descanso" @click="cerrar">
        <X :size="16" :stroke-width="2.5" aria-hidden="true" />
      </button>
    </template>
    <span class="barra" aria-hidden="true"><span class="barra-fill" :style="{ transform: `scaleX(${visible ? fraccionRestante : 0})` }"></span></span>
  </div>
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

/* Celda de la banda: misma caja hundida que SERIES, con los ajustes de ±15 s al costado */
.lectura {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: 1fr 4px;
  min-width: 0;
  background: var(--n0);
  border: 1px solid var(--n3);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.lectura.done { border-color: var(--led-amber); }
.principal {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  min-width: 0;
  padding: 0.45rem 0.5rem 0.4rem 0.75rem;
  background: none;
  border: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.rotulo {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--n6);
  white-space: nowrap;
}
.lectura.done .rotulo { color: var(--led-amber); }
.valor { display: flex; align-items: center; height: 1.9rem; }
.seg-valor { font-size: 1.9rem; }

/* +15 sobre −15, uno encima del otro */
.ajustes { display: flex; flex-direction: column; border-left: 1px solid var(--n3); }
.ajustes .rest-btn { flex: 1; min-width: 3rem; padding: 0 0.4rem; border-radius: 0; }
.ajustes .rest-btn + .rest-btn { border-top: 1px solid var(--n3); }
.rest-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--n7);
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.rest-btn:hover { background: var(--n2); color: var(--n8); }

/* Cerrar: pequeño, en la esquina de la lectura; el área táctil se amplía con ::after */
.cerrar {
  position: absolute;
  top: 0.15rem;
  right: 3.4rem;
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--n6);
  cursor: pointer;
}
.cerrar::after { content: ''; position: absolute; inset: -0.5rem; }
.cerrar:hover { color: var(--n8); }

.barra { grid-column: 1 / -1; display: block; background: var(--n2); }
.barra-fill { display: block; height: 100%; background: var(--n7); transform-origin: left center; transition: transform 0.25s linear; }
.lectura.paused .barra-fill { background: var(--n5); }
.lectura.done .barra-fill { background: var(--led-amber); }
</style>

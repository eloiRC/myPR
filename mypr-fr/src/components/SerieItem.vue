<script setup lang="ts">
// Fila compacta de una serie dentro de su grupo de ejercicio.
// Toque = marcar hecha. Pulsación larga (~450 ms) = levantar la fila y arrastrarla sobre otra para reordenar.
// En escritorio se mantiene el arrastre HTML5 con el ratón.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Pencil, Timer } from 'lucide-vue-next';
import { textoDescanso } from '../composables/useRestTimer';
import { kgTexto } from '../utils/entreno';
import {
  PULSACION_LARGA_MS, siguienteFase, autoScrollDelta, debeIgnorarClick, type FaseToque,
} from '../utils/reordenarTactil';

interface Props {
  serie: any;
  /** Número de serie dentro de su ejercicio */
  n: number;
  completada?: boolean;
  /** Es la siguiente serie pendiente (la del bloque «ahora») */
  actual?: boolean;
}
const props = withDefaults(defineProps<Props>(), { completada: false, actual: false });

const emit = defineEmits<{
  (e: 'toggle', serieId: number): void;
  (e: 'edit', serie: any): void;
  (e: 'dragStart', serieId: number | null): void;
  (e: 'drop', targetId: number): void;
}>();

const fila = ref<HTMLElement | null>(null);
const levantada = ref(false);
const desplazamientoY = ref(0);

// Arrastre HTML5 solo con ratón: en táctil lo gestiona la pulsación larga (si no, Android lo secuestra)
const conRaton = ref(false);
onMounted(() => {
  conRaton.value = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  fila.value?.addEventListener('touchstart', onTouchStart, { passive: true });
  // No pasivo: solo se llama a preventDefault mientras hay una fila levantada
  fila.value?.addEventListener('touchmove', onTouchMove, { passive: false });
  fila.value?.addEventListener('touchend', onTouchEnd);
  fila.value?.addEventListener('touchcancel', onTouchCancel);
});

// ---------- Click: marcar hecha (nunca justo después de un arrastre) ----------
let finArrastre: number | null = null;
const onClick = () => {
  if (debeIgnorarClick(finArrastre, Date.now())) return;
  if (navigator.vibrate) navigator.vibrate(50);
  emit('toggle', props.serie.SerieId);
};

// ---------- Ratón: arrastre HTML5 ----------
const onDragStart = (e: DragEvent) => {
  e.dataTransfer?.setData('text/plain', String(props.serie.SerieId));
  emit('dragStart', props.serie.SerieId);
};
const onDrop = (e: DragEvent) => {
  e.preventDefault();
  emit('drop', props.serie.SerieId);
};

// ---------- Táctil: pulsación larga ----------
let fase: FaseToque = 'esperando';
let timer: ReturnType<typeof setTimeout> | null = null;
let inicioX = 0, inicioY = 0, inicioT = 0, inicioScroll = 0;
let ultimoX = 0, ultimoY = 0;
let raf = 0;
let destinoActual: HTMLElement | null = null;

const limpiarDestino = () => {
  destinoActual?.classList.remove('serie-drop-target');
  destinoActual = null;
};

const destinoBajo = (x: number, y: number): HTMLElement | null => {
  // La fila levantada tiene pointer-events: none, así que elementFromPoint ve la de debajo
  const el = document.elementFromPoint(x, y)?.closest('[data-serie-id]') as HTMLElement | null;
  return el && el !== fila.value ? el : null;
};

const actualizarArrastre = () => {
  desplazamientoY.value = (ultimoY - inicioY) + (window.scrollY - inicioScroll);
  const destino = destinoBajo(ultimoX, ultimoY);
  if (destino !== destinoActual) {
    limpiarDestino();
    destinoActual = destino;
    destino?.classList.add('serie-drop-target');
  }
};

const bucleAutoScroll = () => {
  if (!levantada.value) return;
  const delta = autoScrollDelta(ultimoY, window.innerHeight, 56, 130);
  if (delta !== 0) {
    window.scrollBy(0, delta);
    actualizarArrastre();
  }
  raf = requestAnimationFrame(bucleAutoScroll);
};

const levantar = () => {
  timer = null;
  fase = siguienteFase(fase, { dx: ultimoX - inicioX, dy: ultimoY - inicioY, transcurridoMs: Date.now() - inicioT });
  if (fase !== 'arrastrando') return;
  levantada.value = true;
  if (navigator.vibrate) navigator.vibrate(30);
  emit('dragStart', props.serie.SerieId);
  actualizarArrastre();
  raf = requestAnimationFrame(bucleAutoScroll);
};

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  fase = 'esperando';
  inicioX = ultimoX = t.clientX;
  inicioY = ultimoY = t.clientY;
  inicioT = Date.now();
  inicioScroll = window.scrollY;
  timer = setTimeout(levantar, PULSACION_LARGA_MS);
};

const onTouchMove = (e: TouchEvent) => {
  const t = e.touches[0];
  ultimoX = t.clientX;
  ultimoY = t.clientY;
  if (fase === 'arrastrando') {
    if (e.cancelable) e.preventDefault();
    actualizarArrastre();
    return;
  }
  fase = siguienteFase(fase, { dx: ultimoX - inicioX, dy: ultimoY - inicioY, transcurridoMs: Date.now() - inicioT });
  if (fase === 'scroll' && timer) { clearTimeout(timer); timer = null; }
};

const terminar = (soltar: boolean) => {
  if (timer) { clearTimeout(timer); timer = null; }
  cancelAnimationFrame(raf);
  if (fase === 'arrastrando') {
    finArrastre = Date.now();
    const destino = destinoActual;
    limpiarDestino();
    levantada.value = false;
    desplazamientoY.value = 0;
    const id = destino ? Number(destino.dataset.serieId) : NaN;
    if (soltar && !Number.isNaN(id)) emit('drop', id);
    else emit('dragStart', null);
  }
  fase = 'esperando';
};
const onTouchEnd = (e: TouchEvent) => {
  // El click sintético posterior lo filtra debeIgnorarClick; si hubo arrastre, evitamos además el click
  if (fase === 'arrastrando' && e.cancelable) e.preventDefault();
  terminar(true);
};
const onTouchCancel = () => terminar(false);

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  cancelAnimationFrame(raf);
  limpiarDestino();
  fila.value?.removeEventListener('touchstart', onTouchStart);
  fila.value?.removeEventListener('touchmove', onTouchMove);
  fila.value?.removeEventListener('touchend', onTouchEnd);
  fila.value?.removeEventListener('touchcancel', onTouchCancel);
});

const estilo = computed(() => (levantada.value ? { transform: `translateY(${desplazamientoY.value}px)` } : undefined));
const descanso = computed(() => (props.serie.DescansoSeg != null ? textoDescanso(props.serie.DescansoSeg) : ''));
const resumenAria = computed(() =>
  `Serie ${props.n}: ${kgTexto(props.serie.Kg)} kilos por ${props.serie.Reps} repeticiones. ${props.completada ? 'Hecha' : 'Pendiente'}${props.serie.PR ? ', récord personal' : ''}`);
</script>

<template>
  <div
    ref="fila"
    class="fila"
    :class="{ 'fila--hecha': completada, 'fila--actual': actual && !completada, 'fila--levantada': levantada }"
    :style="estilo"
    :draggable="conRaton"
    :data-serie-id="serie.SerieId"
    @dragstart="onDragStart"
    @dragover.prevent
    @drop.prevent="onDrop"
    @contextmenu.prevent
  >
    <button type="button" class="fila-toque" :aria-pressed="completada" :aria-label="resumenAria" @click="onClick">
      <span class="fila-num" aria-hidden="true">{{ n }}</span>
      <span class="fila-datos">
        <span class="fila-cifras" aria-hidden="true">
          <span class="kg">{{ kgTexto(serie.Kg) }}</span><span class="por">×</span><span class="reps">{{ serie.Reps }}</span>
          <span class="uds">kg · reps</span>
        </span>
        <span v-if="descanso || serie.PR" class="fila-meta" aria-hidden="true">
          <span v-if="serie.PR" class="fila-pr">PR</span>
          <span v-if="descanso" class="fila-descanso" title="Descanso propio de esta serie"><Timer :size="13" :stroke-width="2" />{{ descanso }}</span>
        </span>
      </span>
      <span class="luz" :class="{ 'luz--hecha': completada, 'luz--actual': actual && !completada }" aria-hidden="true"></span>
    </button>
    <button type="button" class="fila-editar" :aria-label="`Editar serie ${n}`" @click.stop="emit('edit', serie)">
      <Pencil :size="18" :stroke-width="2" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.fila {
  position: relative;
  display: flex;
  align-items: stretch;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-md);
  box-shadow: var(--bevel);
  /* Sin selección de texto ni menú contextual (iOS) al mantener pulsado */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: pan-y;
}
.fila--actual { border-color: rgba(255, 176, 32, 0.55); background: var(--n2); }
.fila--levantada {
  z-index: 5;
  pointer-events: none;
  background: var(--n3);
  border-color: var(--n6);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.6);
}
.fila.serie-drop-target { border-color: var(--led-amber); background: var(--led-amber-dim); }

.fila-toque {
  flex: 1;
  min-width: 0;
  min-height: 3.5rem;
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem 0.35rem 0.5rem;
  background: none;
  border: none;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  color: var(--n8);
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-touch-callout: none;
}
.fila-num {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--n6);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.fila-datos { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.fila-cifras {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.kg, .reps { font-size: 1.45rem; font-weight: 600; }
.por { color: var(--n6); font-size: 1.1rem; }
.uds {
  margin-left: 0.15rem;
  font-family: var(--font-display);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--n6);
}
.fila-meta { display: flex; align-items: center; gap: 0.6rem; font-size: 0.8rem; color: var(--n7); }
.fila-descanso { display: inline-flex; align-items: center; gap: 0.25rem; font-variant-numeric: tabular-nums; }
.fila-pr {
  padding: 0 0.35rem;
  border: 1px solid var(--judge-white);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--judge-white);
  line-height: 1.35;
}

/* Estado de la serie: pendiente (aro) · en curso (ámbar) · hecha (blanco de jueces) */
.luz {
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 50%;
  border: 2px solid var(--n5);
  background: transparent;
}
.luz--actual { border-color: var(--led-amber); background: var(--led-amber); }
.luz--hecha { border-color: var(--judge-white); background: var(--judge-white); }

.fila--hecha .kg, .fila--hecha .reps { color: var(--n7); }
.fila--hecha .fila-num { color: var(--n5); }

.fila-editar {
  flex: 0 0 var(--touch-min);
  min-height: 3.5rem;
  display: grid;
  place-items: center;
  background: none;
  border: none;
  border-left: 1px solid var(--n3);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  color: var(--n7);
  cursor: pointer;
}
.fila-editar:hover { background: var(--n3); color: var(--n8); }
.fila-toque:focus-visible, .fila-editar:focus-visible { outline-offset: -3px; }
.fila-toque:hover { background: rgba(255, 255, 255, 0.02); }
</style>

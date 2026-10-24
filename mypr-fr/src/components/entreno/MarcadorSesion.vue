<script setup lang="ts">
// Banda-marcador de la parte alta (pegada arriba al hacer scroll): nombre del entreno (editable),
// SERIES hechas/total, el descanso (slot) y una tira LED con una celda por serie que además sirve
// de navegación: tocar o arrastrar sobre ella lleva a esa serie.
import { ref, nextTick, computed } from 'vue';
import { ChevronLeft, ChartColumn, MessageSquareText } from 'lucide-vue-next';
import SegDisplay from '../SegDisplay.vue';
import { indiceEnTira } from '../../utils/entreno';

interface Props {
  nombre: string;
  hechas: number;
  total: number;
  /** Estado de cada serie en orden: hecha · actual · pendiente */
  celdas: ('hecha' | 'actual' | 'pendiente')[];
  /** Índices donde empieza un tramo de otro ejercicio (para dejar un hueco en la tira) */
  cortes: number[];
  /** Nombre del ejercicio de cada serie (etiqueta al arrastrar) */
  etiquetas: string[];
  /** Serie que se está viendo (cursor de la tira) */
  indice: number;
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'volver'): void;
  (e: 'renombrar', nombre: string): void;
  (e: 'datos'): void;
  (e: 'coach'): void;
  (e: 'ir', indice: number): void;
}>();

const editando = ref(false);
const borrador = ref('');
const input = ref<HTMLInputElement | null>(null);

const empezar = () => {
  borrador.value = props.nombre;
  editando.value = true;
  nextTick(() => input.value?.select());
};
const guardar = () => {
  if (!editando.value) return;
  editando.value = false;
  emit('renombrar', borrador.value);
};
const cancelar = () => { editando.value = false; };

const aria = computed(() => `${props.hechas} de ${props.total} series hechas`);

// ---- Tira como control deslizante ----
const tira = ref<HTMLElement | null>(null);
const arrastrando = ref(false);
const cortesSet = computed(() => new Set(props.cortes));
const hueco = computed(() => (props.celdas.length > 40 ? '1px' : '2px'));
let ultimo = -1;

const desde = (e: PointerEvent) => {
  const r = tira.value?.getBoundingClientRect();
  return r ? indiceEnTira(e.clientX - r.left, r.width, props.celdas.length) : 0;
};
const mover = (e: PointerEvent) => {
  const i = desde(e);
  if (i === ultimo) return;
  ultimo = i;
  emit('ir', i);
};
const alBajar = (e: PointerEvent) => {
  if (!props.celdas.length) return;
  arrastrando.value = true;
  ultimo = -1;
  tira.value?.setPointerCapture(e.pointerId);
  mover(e);
};
const alMover = (e: PointerEvent) => { if (arrastrando.value) mover(e); };
const alSoltar = (e: PointerEvent) => {
  arrastrando.value = false;
  try { tira.value?.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }
};
const alTeclear = (e: KeyboardEvent) => {
  const n = props.celdas.length;
  const mapa: Record<string, number> = { ArrowRight: props.indice + 1, ArrowUp: props.indice + 1, ArrowLeft: props.indice - 1, ArrowDown: props.indice - 1, Home: 0, End: n - 1 };
  if (!(e.key in mapa)) return;
  e.preventDefault();
  emit('ir', Math.min(n - 1, Math.max(0, mapa[e.key])));
};
const textoIndice = computed(() => {
  const c = props.celdas[props.indice];
  const estado = c === 'hecha' ? 'hecha' : c === 'actual' ? 'siguiente' : 'pendiente';
  return `Serie ${props.indice + 1} de ${props.celdas.length}, ${props.etiquetas[props.indice] ?? ''}, ${estado}`;
});
// Posición de la etiqueta flotante, acotada para que no se salga de la pantalla
const posEtiqueta = computed(() => {
  const n = props.celdas.length;
  return Math.min(88, Math.max(12, ((props.indice + 0.5) / Math.max(1, n)) * 100));
});
</script>

<template>
  <header class="marcador">
    <div class="marcador-barra">
      <button type="button" class="icono" aria-label="Volver a entrenos" @click="emit('volver')"><ChevronLeft :size="24" :stroke-width="2" /></button>
      <h1 class="nombre">
        <input
          v-if="editando"
          ref="input"
          v-model="borrador"
          class="nombre-input"
          aria-label="Nombre del entreno"
          maxlength="60"
          enterkeyhint="done"
          @blur="guardar"
          @keyup.enter="guardar"
          @keyup.escape="cancelar"
        >
        <button v-else type="button" class="nombre-btn" title="Toca para editar el nombre" @click="empezar">{{ nombre || 'Sin nombre' }}</button>
      </h1>
      <button type="button" class="icono" aria-label="Datos del entreno" @click="emit('datos')"><ChartColumn :size="22" :stroke-width="2" /></button>
      <button type="button" class="icono" aria-label="Abrir el entrenador IA" @click="emit('coach')"><MessageSquareText :size="22" :stroke-width="2" /></button>
    </div>

    <div class="lecturas">
      <div class="lectura" role="group" :aria-label="aria">
        <span class="rotulo">Series</span>
        <span class="valor">
          <SegDisplay :value="hechas" tone="white" :label="`${hechas} hechas`" class="seg-valor" />
          <span class="de">/ {{ total }}</span>
        </span>
      </div>
      <slot name="descanso" />
    </div>

    <div
      v-if="celdas.length"
      ref="tira"
      class="tira"
      role="slider"
      tabindex="0"
      aria-label="Ir a una serie"
      aria-orientation="horizontal"
      :aria-valuemin="1"
      :aria-valuemax="celdas.length"
      :aria-valuenow="indice + 1"
      :aria-valuetext="textoIndice"
      :style="{ '--hueco': hueco }"
      @pointerdown="alBajar"
      @pointermove="alMover"
      @pointerup="alSoltar"
      @pointercancel="alSoltar"
      @keydown="alTeclear"
    >
      <span
        v-for="(c, i) in celdas"
        :key="i"
        class="celda"
        :class="[`celda--${c}`, { 'celda--corte': i > 0 && cortesSet.has(i), 'celda--cursor': i === indice }]"
      ></span>
      <span v-if="arrastrando" class="etiqueta" :style="{ left: posEtiqueta + '%' }" aria-hidden="true">
        <b>{{ String(indice + 1).padStart(2, '0') }}</b> {{ etiquetas[indice] }}
      </span>
    </div>
  </header>
</template>

<style scoped>
.marcador {
  position: sticky;
  top: 0;
  z-index: 60;
  background: var(--n1);
  border-bottom: 1px solid var(--n3);
  box-shadow: var(--bevel);
  padding: 0.25rem 0.5rem 0.25rem;
}
.marcador-barra { display: flex; align-items: center; gap: 0.15rem; }
.icono {
  flex: 0 0 var(--touch-min);
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  display: grid;
  place-items: center;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--n7);
  cursor: pointer;
}
.icono:hover { background: var(--n2); color: var(--n8); }
.nombre { flex: 1; min-width: 0; margin: 0; font-size: inherit; }
.nombre-btn, .nombre-input {
  width: 100%;
  min-height: var(--touch-min);
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--n8);
  text-align: left;
}
.nombre-btn {
  padding: 0 0.25rem;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nombre-btn:hover { background: var(--n2); }
.nombre-input {
  padding: 0 0.5rem;
  background: var(--n0);
  border: 1px solid var(--led-amber);
  border-radius: var(--radius-sm);
  font-size: 1.4rem;
  outline: none;
}

.lecturas { display: grid; grid-template-columns: 7.25rem minmax(0, 1fr); gap: 0.5rem; padding: 0.25rem 0.5rem 0; }
/* Sin temporizador activado, SERIES ocupa todo el ancho */
.lecturas:not(:has(> .lectura ~ .lectura)) { grid-template-columns: 1fr; }
.lectura {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.45rem 0.6rem 0.55rem 0.75rem;
  background: var(--n0);
  border: 1px solid var(--n3);
  border-radius: var(--radius-md);
}
.rotulo {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--n6);
}
.valor { display: flex; align-items: baseline; gap: 0.5rem; min-height: 1.9rem; }
.seg-valor { font-size: 1.9rem; }
.de {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--n6);
  font-variant-numeric: tabular-nums;
}

.tira {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--hueco, 2px);
  height: var(--touch-min);
  margin: 0 0.5rem;
  touch-action: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.tira:focus-visible { outline: 2px solid var(--led-amber); outline-offset: -2px; border-radius: var(--radius-sm); }
.celda { flex: 1; min-width: 1px; height: 6px; background: var(--n3); border-radius: 1px; pointer-events: none; }
.celda--hecha { background: var(--judge-white); }
.celda--actual { background: var(--led-amber); }
.celda--corte { margin-left: 4px; }
/* Cursor: la serie que se está viendo, más alta que el resto */
.celda--cursor { height: 16px; box-shadow: 0 0 0 1px var(--n8); }
.etiqueta {
  position: absolute;
  top: calc(100% + 0.15rem);
  transform: translateX(-50%);
  max-width: 14rem;
  padding: 0.25rem 0.6rem;
  background: var(--n0);
  border: 1px solid var(--n5);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--n8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
.etiqueta b { color: var(--led-amber); margin-right: 0.25rem; }
</style>

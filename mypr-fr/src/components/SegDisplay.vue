<script setup lang="ts">
import { computed } from 'vue';
import { segmentosDe, celdasDe, type Celda } from '../utils/segmentos';

// Display de 7 segmentos dibujado en SVG: los segmentos apagados quedan visibles
// (como en un marcador LED real). El tamaño sale de font-size: 1em = alto del dígito.
interface Props {
  value: string | number;
  /** Texto accesible; por defecto el propio valor */
  label?: string;
  /** Tono del segmento encendido */
  tone?: 'amber' | 'red' | 'white' | 'muted';
  /** Ocultar los segmentos apagados (p. ej. sobre fondos claros) */
  noGhost?: boolean;
}
const props = withDefaults(defineProps<Props>(), { tone: 'amber', noGhost: false, label: undefined });

const texto = computed(() => String(props.value));
const celdas = computed<Celda[]>(() => celdasDe(texto.value));
const ariaLabel = computed(() => props.label ?? texto.value.replace('.', ','));

// Geometría en una caja de 60×100: segmentos hexagonales de grosor T
const T = 10;
const G = 2;
const L = 10, R = 50, TOP = 10, MID = 50, BOT = 90;
const h = (x1: number, x2: number, cy: number) =>
  `${x1},${cy} ${x1 + T / 2},${cy - T / 2} ${x2 - T / 2},${cy - T / 2} ${x2},${cy} ${x2 - T / 2},${cy + T / 2} ${x1 + T / 2},${cy + T / 2}`;
const v = (cx: number, y1: number, y2: number) =>
  `${cx},${y1} ${cx + T / 2},${y1 + T / 2} ${cx + T / 2},${y2 - T / 2} ${cx},${y2} ${cx - T / 2},${y2 - T / 2} ${cx - T / 2},${y1 + T / 2}`;
const SEG: Record<string, string> = {
  a: h(L + G, R - G, TOP),
  b: v(R, TOP + G, MID - G),
  c: v(R, MID + G, BOT - G),
  d: h(L + G, R - G, BOT),
  e: v(L, MID + G, BOT - G),
  f: v(L, TOP + G, MID - G),
  g: h(L + G, R - G, MID),
};
const TODOS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
</script>

<template>
  <span class="seg" :class="[`seg--${tone}`, { 'seg--noghost': noGhost }]" role="img" :aria-label="ariaLabel">
    <template v-for="(c, i) in celdas" :key="i">
      <svg v-if="c.tipo === 'digito'" class="seg-cell" viewBox="0 0 60 100" aria-hidden="true">
        <polygon v-for="s in TODOS" :key="s" :points="SEG[s]" :class="segmentosDe(c.char).includes(s) ? 'on' : 'off'" />
      </svg>
      <svg v-else-if="c.tipo === 'punto'" class="seg-cell seg-cell--narrow" viewBox="0 0 16 100" aria-hidden="true">
        <rect x="3" y="83" width="10" height="10" class="on" />
      </svg>
      <svg v-else-if="c.tipo === 'dospuntos'" class="seg-cell seg-cell--narrow" viewBox="0 0 16 100" aria-hidden="true">
        <rect x="3" y="28" width="10" height="10" class="on" />
        <rect x="3" y="62" width="10" height="10" class="on" />
      </svg>
      <span v-else class="seg-gap" aria-hidden="true"></span>
    </template>
  </span>
</template>

<style scoped>
.seg {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.08em;
  height: 1em;
  line-height: 1;
  /* inclinación de los displays LED reales */
  transform: skewX(-6deg);
}
.seg-cell { height: 1em; width: 0.6em; overflow: visible; }
.seg-cell--narrow { width: 0.16em; }
.seg-gap { display: inline-block; width: 0.3em; }
.seg .on { fill: currentColor; }
.seg .off { fill: currentColor; opacity: 0.07; }
.seg--noghost .off { opacity: 0; }
.seg--amber { color: var(--led-amber); }
.seg--red { color: var(--led-red); }
.seg--white { color: var(--judge-white); }
.seg--muted { color: var(--n6); }
</style>

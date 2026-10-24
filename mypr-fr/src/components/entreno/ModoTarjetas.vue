<script setup lang="ts">
// Modo tarjetas: una serie por pantalla, dígitos ámbar enormes, deslizar para cambiar de serie.
// El estado (índice actual, posición recordada) vive en el padre; aquí solo el gesto y el dibujo.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Check, Pencil, Timer, Undo2 } from 'lucide-vue-next';
import SegDisplay from '../SegDisplay.vue';
import { textoDescanso } from '../../composables/useRestTimer';
import { kgDisplay } from '../../utils/segmentos';

interface Props {
  series: any[];
  indice: number;
  hechas: Record<number, boolean>;
  nombreDe: (serie: any) => string;
  gruposDe: (serie: any) => string[];
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:indice', i: number): void;
  (e: 'toggle', serieId: number): void;
  (e: 'editar', serie: any): void;
  (e: 'irEjercicio', ejercicioId: number): void;
}>();

const serie = computed(() => props.series[props.indice] ?? null);
const hecha = (id: number) => props.hechas[id] ?? false;
const total = computed(() => props.series.length);

// Las cifras ocupan todo el ancho que dejan sus caracteres: más grandes cuando son pocos (45 × 8),
// más ajustadas con decimales (82,5 × 12). Un dígito mide ~0,72 em y el punto decimal ~0,35.
const anchoEm = computed(() => {
  if (!serie.value) return 3;
  return [...`${kgDisplay(serie.value.Kg)}${serie.value.Reps}`].reduce((a, c) => a + (c === '.' ? 0.35 : 0.72), 0);
});

const direccion = ref<'next' | 'prev'>('next');
watch(() => props.indice, (n, o) => { direccion.value = n >= o ? 'next' : 'prev'; });

const ir = (i: number) => {
  if (i < 0 || i >= total.value || i === props.indice) return;
  emit('update:indice', i);
};
const avanza = () => ir(props.indice + 1);
const retrocede = () => ir(props.indice - 1);

// Triple toque sobre la tarjeta = marcar hecha (se mantiene el gesto; ahora hay además botón)
const TAP_WINDOW_MS = 800;
let tapCount = 0;
let lastTap = 0;
const onCardTap = () => {
  const now = Date.now();
  if (now - lastTap > TAP_WINDOW_MS) tapCount = 0;
  tapCount++;
  lastTap = now;
  if (tapCount >= 3 && serie.value) {
    emit('toggle', serie.value.SerieId);
    tapCount = 0;
    if (navigator.vibrate) navigator.vibrate(50);
  }
};

// Deslizar
let x0 = 0, y0 = 0;
let movido = false;
const onTouchStart = (e: TouchEvent) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; movido = false; };
const onTouchMove = (e: TouchEvent) => {
  if (Math.abs(e.touches[0].clientX - x0) > 10 || Math.abs(e.touches[0].clientY - y0) > 10) movido = true;
};
const onTouchEnd = (e: TouchEvent) => {
  if (!movido) return;
  const dx = e.changedTouches[0].clientX - x0;
  const dy = e.changedTouches[0].clientY - y0;
  if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? retrocede : avanza)();
};

const onKey = (e: KeyboardEvent) => {
  const el = document.activeElement as HTMLElement | null;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  if (e.key === 'ArrowLeft') { retrocede(); e.preventDefault(); }
  if (e.key === 'ArrowRight') { avanza(); e.preventDefault(); }
};
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));

</script>

<template>
  <div v-if="serie" class="modo-tarjetas">
    <div class="area" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend="onTouchEnd">
      <Transition :name="direccion === 'next' ? 'slide-next' : 'slide-prev'" mode="out-in">
        <div :key="serie.SerieId" class="tarjeta" :class="{ 'tarjeta--hecha': hecha(serie.SerieId) }" @click="onCardTap">
          <button type="button" class="ejercicio" @click.stop="emit('irEjercicio', serie.ExerciciId)">{{ nombreDe(serie) }}</button>
          <ul v-if="gruposDe(serie).length" class="chips" aria-label="Músculos">
            <li v-for="g in gruposDe(serie)" :key="g" class="chip-m">{{ g }}</li>
          </ul>

          <div class="cifras" :style="{ '--ancho-em': anchoEm }" role="group" :aria-label="`${kgDisplay(serie.Kg).replace('.', ',')} kilos por ${serie.Reps} repeticiones`">
            <div class="cifra">
              <SegDisplay :value="kgDisplay(serie.Kg)" :tone="hecha(serie.SerieId) ? 'white' : 'amber'" :label="`${kgDisplay(serie.Kg).replace('.', ',')} kilos`" class="seg-enorme" />
              <span class="unidad">kg</span>
            </div>
            <span class="por" aria-hidden="true">×</span>
            <div class="cifra">
              <SegDisplay :value="serie.Reps" :tone="hecha(serie.SerieId) ? 'white' : 'amber'" :label="`${serie.Reps} repeticiones`" class="seg-enorme" />
              <span class="unidad">reps</span>
            </div>
          </div>

          <p class="carga">
            <span v-if="serie.PR" class="pr-tag">PR</span>
            {{ serie.Carga }} kg en total
            <span v-if="serie.DescansoSeg != null" class="descanso" title="Descanso propio de esta serie"><Timer :size="15" :stroke-width="2" />{{ textoDescanso(serie.DescansoSeg) }}</span>
          </p>

          <div class="acciones">
            <button type="button" class="btn hecha" :class="hecha(serie.SerieId) ? 'btn-secondary' : 'btn-primary'" @click.stop="emit('toggle', serie.SerieId)">
              <component :is="hecha(serie.SerieId) ? Undo2 : Check" :size="24" :stroke-width="2.75" aria-hidden="true" />
              {{ hecha(serie.SerieId) ? 'Desmarcar' : 'Hecha' }}
            </button>
            <button type="button" class="btn btn-secondary editar" aria-label="Editar serie" @click.stop="emit('editar', serie)"><Pencil :size="22" :stroke-width="2" aria-hidden="true" /></button>
          </div>
        </div>
      </Transition>
    </div>

  </div>
</template>

<style scoped>
.modo-tarjetas { padding: 0.75rem 0.75rem 0; max-width: 40rem; margin: 0 auto; }
.area { touch-action: pan-y; user-select: none; -webkit-user-select: none; }
.tarjeta {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: max(24rem, calc(100dvh - 22rem));
  padding: 1.25rem 1rem 1.1rem;
  text-align: center;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  box-shadow: var(--bevel);
  cursor: pointer;
}
.tarjeta--hecha { border-color: var(--n5); }
.pr-tag {
  padding: 0 0.4rem;
  border: 1px solid var(--judge-white);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--judge-white);
}
.ejercicio {
  max-width: 100%;
  padding: 0;
  background: none;
  border: none;
  color: var(--n8);
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 7.5vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.05;
  text-transform: uppercase;
  cursor: pointer;
  overflow-wrap: anywhere;
}
.chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem; list-style: none; margin: 0.5rem 0 0; padding: 0; }
.chip-m {
  padding: 0 0.5rem;
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--n7);
  line-height: 1.6;
}
.cifras {
  container-type: inline-size;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.5rem, 3vw, 1.25rem);
  width: 100%;
  margin: 0.9rem 0 0.5rem;
  padding: 0.75rem 0.25rem;
  background: var(--n0);
  border: 1px solid var(--n3);
  border-radius: var(--radius-md);
}
.cifra { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; min-width: 0; }
.seg-enorme { font-size: min(9rem, calc((100cqw - 4.5rem) / var(--ancho-em, 3))); }
.unidad { font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--n7); }
.por { font-family: var(--font-display); font-size: clamp(1.6rem, 7vw, 2.4rem); font-weight: 600; color: var(--n6); margin-bottom: 1.4rem; }
.carga { display: flex; align-items: center; justify-content: center; gap: 0.9rem; margin: 0 0 0.75rem; color: var(--n7); font-variant-numeric: tabular-nums; }
.descanso { display: inline-flex; align-items: center; gap: 0.3rem; }
.acciones { display: grid; grid-template-columns: 1fr var(--touch-min); gap: 0.6rem; width: 100%; max-width: 24rem; }
.acciones .btn { min-height: 3.75rem; }
.hecha { font-size: 1.3rem; }
.editar { padding: 0; }


.slide-next-enter-active, .slide-next-leave-active, .slide-prev-enter-active, .slide-prev-leave-active { transition: transform 0.24s ease, opacity 0.24s ease; }
.slide-next-enter-from { transform: translateX(40%); opacity: 0; }
.slide-next-leave-to { transform: translateX(-40%); opacity: 0; }
.slide-prev-enter-from { transform: translateX(-40%); opacity: 0; }
.slide-prev-leave-to { transform: translateX(40%); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .slide-next-enter-from, .slide-next-leave-to, .slide-prev-enter-from, .slide-prev-leave-to { transform: none; }
}
</style>

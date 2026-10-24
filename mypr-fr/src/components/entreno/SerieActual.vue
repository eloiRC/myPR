<script setup lang="ts">
// Bloque «ahora»: la siguiente serie pendiente en segmentos ámbar a todo el ancho,
// con [Hecha] y [Repetir] al alcance del pulgar. Si no queda ninguna, estado de entreno completo.
import { computed } from 'vue';
import { Check, Copy, Timer, Plus, Flag, Pencil } from 'lucide-vue-next';
import SegDisplay from '../SegDisplay.vue';
import JudgeLights from '../JudgeLights.vue';
import { textoDescanso } from '../../composables/useRestTimer';
import { kgDisplay } from '../../utils/segmentos';

interface Props {
  serie: any | null;
  nombreEjercicio?: string;
  grupos?: string[];
  /** Número de esta serie dentro de su ejercicio y total de series de ese ejercicio */
  n?: number;
  totalEjercicio?: number;
  /** Hay series pero todas están hechas */
  completo?: boolean;
  ocupado?: boolean;
}
const props = withDefaults(defineProps<Props>(), { nombreEjercicio: '', grupos: () => [], n: 1, totalEjercicio: 1, completo: false, ocupado: false });
const emit = defineEmits<{
  (e: 'hecha'): void;
  (e: 'repetir'): void;
  (e: 'editar'): void;
  (e: 'anadir'): void;
  (e: 'terminar'): void;
  (e: 'irEjercicio'): void;
}>();

const descanso = computed(() => (props.serie?.DescansoSeg != null ? textoDescanso(props.serie.DescansoSeg) : ''));
// Ancho del marcador en em de dígito (celda 0,6 em, punto 0,16 em, hueco 0,08 em): el tamaño se
// ajusta para que kg y reps llenen ~88 % de la ventana, también con "102.5" × 12.
const anchoEm = (t: string) => {
  const s = String(t);
  let w = 0, n = 0;
  for (const ch of s) { w += ch === '.' ? 0.16 : 0.6; n++; }
  return w + Math.max(0, n - 1) * 0.08;
};
const totalEm = computed(() => props.serie ? (anchoEm(kgDisplay(props.serie.Kg)) + anchoEm(String(props.serie.Reps)) + 1.5).toFixed(3) : '1');
const aria = computed(() => props.serie ? `${kgDisplay(props.serie.Kg).replace('.', ',')} kilos por ${props.serie.Reps} repeticiones` : '');
</script>

<template>
  <section class="ahora" :class="{ 'ahora--completo': completo && !serie }" aria-label="Serie actual">
    <template v-if="serie">
      <div class="cabecera">
        <button type="button" class="ejercicio" @click="emit('irEjercicio')">{{ nombreEjercicio }}</button>
        <span class="cuenta" :aria-label="`Serie ${n} de ${totalEjercicio}`">{{ n }}<span class="cuenta-total">/{{ totalEjercicio }}</span></span>
        <button type="button" class="editar" aria-label="Editar esta serie" @click="emit('editar')"><Pencil :size="18" :stroke-width="2" /></button>
      </div>
      <ul v-if="grupos.length" class="chips" aria-label="Músculos">
        <li v-for="g in grupos" :key="g" class="chip-m">{{ g }}</li>
      </ul>

      <div class="cifras" role="group" :aria-label="aria" :style="{ '--tot': totalEm }">
        <div class="cifra">
          <SegDisplay :value="kgDisplay(serie.Kg)" tone="amber" :label="`${kgDisplay(serie.Kg).replace('.', ',')} kilos`" class="seg-grande" />
          <span class="unidad">kg</span>
        </div>
        <span class="por" aria-hidden="true">×</span>
        <div class="cifra">
          <SegDisplay :value="serie.Reps" tone="amber" :label="`${serie.Reps} repeticiones`" class="seg-grande" />
          <span class="unidad">reps</span>
        </div>
      </div>

      <p v-if="descanso || serie.PR" class="meta">
        <span v-if="serie.PR" class="pr-tag">PR</span>
        <span v-if="descanso" class="descanso"><Timer :size="15" :stroke-width="2" />Descanso {{ descanso }}</span>
      </p>

      <div class="acciones">
        <button type="button" class="btn btn-primary hecha" :disabled="ocupado" @click="emit('hecha')"><Check :size="26" :stroke-width="3" aria-hidden="true" />Hecha</button>
        <button type="button" class="btn btn-secondary repetir" :disabled="ocupado" @click="emit('repetir')"><Copy :size="20" :stroke-width="2" aria-hidden="true" />Repetir serie</button>
      </div>
      <button type="button" class="enlace" @click="emit('anadir')"><Plus :size="16" :stroke-width="2.5" aria-hidden="true" />Añadir otra serie</button>
    </template>

    <template v-else-if="completo">
      <span class="rotulo">Entreno completo</span>
      <div class="completo-luces"><JudgeLights :lit="3" secuencia size="lg" label="Tres luces blancas: entreno completo" /></div>
      <p class="completo-texto">Todas las series hechas.</p>
      <div class="acciones">
        <button type="button" class="btn btn-primary hecha" @click="emit('terminar')"><Flag :size="22" :stroke-width="2.5" aria-hidden="true" />Terminar entreno</button>
        <button type="button" class="btn btn-secondary repetir" @click="emit('anadir')"><Plus :size="20" :stroke-width="2.5" aria-hidden="true" />Añadir serie</button>
      </div>
    </template>

    <template v-else>
      <span class="rotulo">Sin series</span>
      <p class="completo-texto">Apunta la primera serie o pide al entrenador que te proponga un entreno.</p>
      <div class="acciones">
        <button type="button" class="btn btn-primary hecha" @click="emit('anadir')"><Plus :size="24" :stroke-width="2.75" aria-hidden="true" />Añadir serie</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ahora {
  margin: 0.75rem 0.75rem 0;
  padding: 0.75rem 1rem 0.9rem;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  box-shadow: var(--bevel);
}
.cabecera { display: flex; align-items: baseline; gap: 0.75rem; }
.cuenta {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--n8);
  font-variant-numeric: tabular-nums;
}
.cuenta-total { color: var(--n6); }
.rotulo {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--n6);
}
.editar {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  flex-shrink: 0;
  align-self: center;
  margin: -0.5rem -0.75rem -0.5rem 0;
  display: grid;
  place-items: center;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--n7);
  cursor: pointer;
}
.editar:hover { background: var(--n2); color: var(--n8); }
.ejercicio {
  display: block;
  flex: 1;
  min-width: 0;
  padding: 0;
  background: none;
  border: none;
  color: var(--n8);
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 7vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.05;
  text-align: left;
  text-transform: uppercase;
  cursor: pointer;
  overflow-wrap: anywhere;
  text-decoration: none;
}
.chips { display: flex; flex-wrap: wrap; gap: 0.35rem; list-style: none; margin: 0.65rem 0 0; padding: 0; }
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
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
  container-type: inline-size;
  margin: 1rem 0 0.5rem;
  padding: 1rem 0.5rem 0.75rem;
  background: var(--n0);
  border: 1px solid var(--n3);
  border-radius: var(--radius-md);
}
.cifra { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; min-width: 0; }
/* 88 % del ancho útil de la ventana repartido según el ancho real de las cifras */
.cifra { font-size: min(6rem, calc(88cqi / var(--tot, 5))); }
.seg-grande { font-size: 1em; }
.unidad {
  font-family: var(--font-display);
  font-size: 0.85rem;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--n6);
}
.por {
  align-self: center;
  margin-bottom: 1.2rem;
  width: calc(1.5 * min(6rem, calc(88cqi / var(--tot, 5))));
  text-align: center;
  font-family: var(--font-display);
  font-size: calc(0.6 * min(6rem, calc(88cqi / var(--tot, 5))));
  font-weight: 600;
  color: var(--n6);
}

.meta { display: flex; align-items: center; justify-content: center; gap: 0.9rem; margin: 0 0 0.6rem; font-size: 0.9rem; color: var(--n7); }
.descanso { display: inline-flex; align-items: center; gap: 0.3rem; font-variant-numeric: tabular-nums; }
.pr-tag {
  padding: 0 0.4rem;
  border: 1px solid var(--judge-white);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--judge-white);
}

.acciones { display: grid; grid-template-columns: 1.35fr 1fr; gap: 0.6rem; margin-top: 0.6rem; }
.acciones .btn { min-height: 3.75rem; font-size: 1.15rem; }
.hecha { font-size: 1.4rem !important; }
.enlace {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  min-height: var(--touch-min);
  margin-top: 0.35rem;
  background: none;
  border: none;
  color: var(--n7);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.enlace:hover { color: var(--n8); }

.ahora--completo { padding-bottom: 1rem; }
.completo-luces { display: flex; justify-content: center; margin: 1rem 0 0.5rem; }
.completo-texto { margin: 0.5rem 0 0; text-align: center; color: var(--n7); }
.ahora--completo .acciones { grid-template-columns: 1fr; }
.ahora:not(.ahora--completo) .acciones:has(.hecha:only-child) { grid-template-columns: 1fr; }
</style>

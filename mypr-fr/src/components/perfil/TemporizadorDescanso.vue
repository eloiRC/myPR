<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRestTimer, DURACIONES_PRESET, DURACION_MIN_SEG, DURACION_MAX_SEG } from '../../composables/useRestTimer';
import { mmss } from '../../utils/segmentos';
import SegDisplay from '../SegDisplay.vue';
import SwitchRow from './SwitchRow.vue';

// Ajustes por usuario, guardados en el servidor a través de useRestTimer
const rest = useRestTimer();
const esPersonalizada = ref(!DURACIONES_PRESET.includes(rest.duracionSeg.value));
const duracionPersonalizada = ref(rest.duracionSeg.value);
const valorSelector = computed(() => (esPersonalizada.value ? 'custom' : String(rest.duracionSeg.value)));

const elegir = (v: string) => {
  if (v === 'custom') {
    esPersonalizada.value = true;
    rest.setDuracion(duracionPersonalizada.value);
  } else {
    esPersonalizada.value = false;
    rest.setDuracion(Number(v));
  }
};
const onCambiarPersonalizada = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value);
  if (!Number.isFinite(n)) return;
  duracionPersonalizada.value = n;
  rest.setDuracion(n);
};

onMounted(() => {
  rest.cargarDesdeServidor().then(() => {
    esPersonalizada.value = !DURACIONES_PRESET.includes(rest.duracionSeg.value);
    duracionPersonalizada.value = rest.duracionSeg.value;
  });
});
</script>

<template>
  <section class="panel tmp" aria-labelledby="tmp-h">
    <h2 id="tmp-h" class="panel-title">Temporizador de descanso</h2>

    <SwitchRow id="rest-on" label="Activar temporizador" :model-value="rest.habilitado.value"
      @update:model-value="rest.setHabilitado($event)" />

    <template v-if="rest.habilitado.value">
      <div class="tmp-readout">
        <span class="tmp-readout-label" id="tmp-dur-l">Duración por defecto</span>
        <SegDisplay class="tmp-seg" :value="mmss(rest.duracionSeg.value)" tone="red"
          :label="`Duración por defecto: ${mmss(rest.duracionSeg.value)}`" />
      </div>

      <div class="tmp-presets" role="radiogroup" aria-labelledby="tmp-dur-l">
        <button v-for="d in DURACIONES_PRESET" :key="d" type="button" role="radio" class="tmp-preset"
          :aria-checked="valorSelector === String(d)" @click="elegir(String(d))">{{ mmss(d) }}</button>
        <button type="button" role="radio" class="tmp-preset" :aria-checked="valorSelector === 'custom'"
          @click="elegir('custom')">Otro</button>
      </div>

      <div v-if="esPersonalizada" class="form-group tmp-custom">
        <label for="rest-custom">Segundos ({{ DURACION_MIN_SEG }}-{{ DURACION_MAX_SEG }})</label>
        <input id="rest-custom" type="number" inputmode="numeric" class="input" :min="DURACION_MIN_SEG"
          :max="DURACION_MAX_SEG" :value="rest.duracionSeg.value" @change="onCambiarPersonalizada" />
      </div>

      <SwitchRow id="rest-auto" label="Iniciar al completar una serie" :model-value="rest.autoIniciar.value"
        @update:model-value="rest.setAutoIniciar($event)" />
    </template>

    <p v-if="rest.errorGuardado.value" class="tmp-error" role="alert">{{ rest.errorGuardado.value }}</p>
  </section>
</template>

<style scoped>
.panel-title {
  margin: 0 0 0.5rem; font-family: var(--font-display); font-size: 0.85rem; font-weight: 700;
  color: var(--n6); text-transform: uppercase; letter-spacing: 0.12em;
}
.tmp-readout {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  margin: 0.5rem 0 0.75rem; padding: 0.75rem 1rem; background: var(--n0);
  border: 1px solid var(--n3); border-radius: var(--radius-md); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
}
.tmp-readout-label { font-family: var(--font-display); font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--n6); }
.tmp-seg { font-size: 2.25rem; }
.tmp-presets { display: flex; margin-bottom: 0.75rem; border: 1px solid var(--n4); border-radius: var(--radius-md); overflow: hidden; background: var(--n2); }
.tmp-preset {
  flex: 1; min-height: var(--touch-min); padding: 0 0.25rem; background: transparent; color: var(--n7);
  border: 0; border-left: 1px solid var(--n4); cursor: pointer; font-family: var(--font-display);
  font-size: 1.05rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
}
.tmp-preset:first-child { border-left: 0; }
.tmp-preset[aria-checked='true'] { background: var(--led-amber); color: var(--on-amber); }
.tmp-preset:focus-visible { outline-offset: -2px; position: relative; }
.tmp-custom { margin-bottom: 0.5rem; }
.tmp-error { margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--led-red); }
</style>

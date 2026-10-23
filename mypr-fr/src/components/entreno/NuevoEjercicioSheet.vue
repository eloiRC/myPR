<script setup lang="ts">
// Crear ejercicio nuevo sin salir del entreno (hoja inferior; sustituye al modal).
import { ref, watch } from 'vue';
import BottomSheet from '../BottomSheet.vue';

const props = defineProps<{
  open: boolean;
  grupos: { GrupMuscularId: number; Nom: string }[];
  guardando: boolean;
  error: string;
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'guardar', valores: { Nom: string; gruposMusculares: number[] }): void;
}>();

const nombre = ref('');
const seleccion = ref<number[]>([]);
watch(() => props.open, (abierta) => {
  if (abierta) { nombre.value = ''; seleccion.value = []; }
});

const enviar = () => emit('guardar', { Nom: nombre.value, gruposMusculares: [...seleccion.value] });
</script>

<template>
  <BottomSheet :open="open" title="Nuevo ejercicio" @close="emit('close')">
    <form class="nuevo" @submit.prevent="enviar">
      <div class="campo">
        <label class="rotulo" for="nuevo-ej-nombre">Nombre</label>
        <input id="nuevo-ej-nombre" v-model="nombre" class="entrada" type="text" required maxlength="80" autocomplete="off">
      </div>
      <fieldset class="campo grupos">
        <legend class="rotulo">Grupos musculares</legend>
        <div class="chips">
          <label v-for="g in grupos" :key="g.GrupMuscularId" class="chip-check">
            <input v-model="seleccion" type="checkbox" :value="g.GrupMuscularId">
            <span>{{ g.Nom }}</span>
          </label>
        </div>
      </fieldset>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="acciones">
        <button type="submit" class="btn btn-primary" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar ejercicio' }}</button>
        <button type="button" class="btn btn-secondary" @click="emit('close')">Cancelar</button>
      </div>
    </form>
  </BottomSheet>
</template>

<style scoped>
.nuevo { display: flex; flex-direction: column; gap: 1rem; }
.campo { display: flex; flex-direction: column; gap: 0.4rem; border: none; padding: 0; margin: 0; min-width: 0; }
.rotulo {
  padding: 0;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--n6);
}
.entrada {
  min-height: 3rem;
  padding: 0 0.75rem;
  background: var(--n0);
  color: var(--n8);
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 1rem;
}
.entrada:focus { outline: none; border-color: var(--led-amber); box-shadow: 0 0 0 1px var(--led-amber); }
.chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.4rem; }
.chip-check { position: relative; }
.chip-check input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.chip-check span {
  display: inline-flex;
  align-items: center;
  min-height: var(--touch-min);
  padding: 0 0.9rem;
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--n7);
}
.chip-check input:checked + span { border-color: var(--led-amber); background: var(--led-amber-dim); color: var(--led-amber); }
.chip-check input:focus-visible + span { outline: 2px solid var(--led-amber); outline-offset: 2px; }
.error {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--led-red);
  border-radius: var(--radius-sm);
  background: var(--led-red-dim);
  color: var(--led-red);
  font-size: 0.9rem;
}
.acciones { display: flex; flex-direction: column; gap: 0.5rem; }
.acciones .btn { width: 100%; }
.acciones .btn-primary { min-height: 3.5rem; font-size: 1.1rem; }
</style>

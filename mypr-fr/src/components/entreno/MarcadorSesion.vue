<script setup lang="ts">
// Banda-marcador de la parte alta: nombre del entreno (editable), SERIES hechas/total,
// tiempo de sesión en segmentos y una tira LED con una celda por serie.
import { ref, nextTick, computed } from 'vue';
import { ChevronLeft, ChartColumn, MessageSquareText } from 'lucide-vue-next';
import SegDisplay from '../SegDisplay.vue';

interface Props {
  nombre: string;
  hechas: number;
  total: number;
  /** Tiempo de sesión ya formateado (m:ss o h:mm) */
  tiempo: string;
  /** Estado de cada serie en orden: hecha · actual · pendiente */
  celdas: ('hecha' | 'actual' | 'pendiente')[];
}
const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'volver'): void;
  (e: 'renombrar', nombre: string): void;
  (e: 'datos'): void;
  (e: 'coach'): void;
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
      <div class="lectura lectura--tiempo">
        <span class="rotulo">Tiempo</span>
        <span class="valor"><SegDisplay :value="tiempo" tone="amber" :label="`Tiempo de sesión ${tiempo}`" class="seg-valor" /></span>
      </div>
    </div>

    <div v-if="celdas.length" class="tira" aria-hidden="true">
      <span v-for="(c, i) in celdas" :key="i" class="celda" :class="`celda--${c}`"></span>
    </div>
  </header>
</template>

<style scoped>
.marcador {
  background: var(--n1);
  border-bottom: 1px solid var(--n3);
  box-shadow: var(--bevel);
  padding: 0.25rem 0.5rem 0.75rem;
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

.lecturas { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.25rem 0.5rem 0; }
.lectura {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.45rem 0.75rem 0.55rem;
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

.tira { display: flex; gap: 2px; margin: 0.6rem 0.5rem 0; height: 6px; }
.celda { flex: 1; min-width: 2px; background: var(--n3); border-radius: 1px; }
.celda--hecha { background: var(--judge-white); }
.celda--actual { background: var(--led-amber); }
</style>

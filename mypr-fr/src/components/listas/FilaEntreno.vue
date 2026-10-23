<script setup lang="ts">
import { MoreVertical, ChevronRight } from 'lucide-vue-next';
import SegDisplay from '../SegDisplay.vue';

// Una fila de la lista de entrenos: abrir al tocar, acciones en el menú de tres puntos.
defineProps<{ nombre: string; fecha: string; cargaT: number }>();
const emit = defineEmits<{ (e: 'abrir'): void; (e: 'menu'): void }>();
</script>

<template>
  <div class="fila">
    <button type="button" class="fila-main" @click="emit('abrir')">
      <span class="fila-texto">
        <span class="fila-nombre">{{ nombre }}</span>
        <span class="fila-fecha">{{ fecha }}</span>
      </span>
      <span class="fila-carga">
        <SegDisplay :value="String(cargaT)" tone="amber" :label="`${String(cargaT).replace('.', ',')} toneladas`" class="fila-seg" />
        <span class="fila-unidad">t</span>
      </span>
      <ChevronRight :size="18" class="fila-chev" aria-hidden="true" />
    </button>
    <button type="button" class="fila-menu" :aria-label="`Acciones de ${nombre}`" @click="emit('menu')">
      <MoreVertical :size="20" />
    </button>
  </div>
</template>

<style scoped>
.fila {
  display: flex;
  align-items: stretch;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  box-shadow: var(--bevel);
  margin-bottom: 0.5rem;
}
.fila:hover { background: var(--n2); border-color: var(--n4); }
.fila-main {
  flex: 1;
  min-width: 0;
  min-height: 4rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.25rem 0.7rem 1rem;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-lg);
}
.fila-texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.fila-nombre {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fila-fecha { font-size: 0.8rem; color: var(--n6); font-variant-numeric: tabular-nums; }
.fila-carga { display: flex; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
.fila-seg { font-size: 1.5rem; }
.fila-unidad { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: var(--n6); text-transform: uppercase; line-height: 1; }
.fila-chev { color: var(--n5); flex-shrink: 0; }
.fila-menu {
  width: var(--touch-min);
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: none;
  border: none;
  border-left: 1px solid var(--n3);
  color: var(--n6);
  cursor: pointer;
  border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
}
.fila-menu:hover { color: var(--n8); background: var(--n3); }
.fila-main:focus-visible, .fila-menu:focus-visible { outline: 2px solid var(--judge-white); outline-offset: -2px; }
</style>

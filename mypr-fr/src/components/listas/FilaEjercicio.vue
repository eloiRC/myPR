<script setup lang="ts">
import { Pencil } from 'lucide-vue-next';
import SegDisplay from '../SegDisplay.vue';
import { kgDisplay } from '../../utils/segmentos';

// Fila del índice de ejercicios: nombre, grupos musculares y récord en segmentos.
defineProps<{ nombre: string; pr: number; grupos: string[] }>();
const emit = defineEmits<{ (e: 'abrir'): void; (e: 'editar'): void }>();
</script>

<template>
  <div class="fe">
    <button type="button" class="fe-main" @click="emit('abrir')">
      <span class="fe-texto">
        <span class="fe-nombre">{{ nombre }}</span>
        <span v-if="grupos.length" class="fe-grupos">
          <span v-for="(g, i) in grupos" :key="i" class="fe-grupo">{{ g }}</span>
        </span>
      </span>
      <span class="fe-pr">
        <template v-if="pr > 0">
          <SegDisplay :value="kgDisplay(pr)" tone="white" :label="`Récord ${kgDisplay(pr).replace('.', ',')} kg`" class="fe-seg" />
          <span class="fe-unidad">kg</span>
        </template>
        <span v-else class="fe-sinpr">sin PR</span>
      </span>
    </button>
    <button type="button" class="fe-edit" :aria-label="`Editar ${nombre}`" @click="emit('editar')">
      <Pencil :size="18" />
    </button>
  </div>
</template>

<style scoped>
.fe {
  display: flex;
  align-items: stretch;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  box-shadow: var(--bevel);
  margin-bottom: 0.5rem;
}
.fe:hover { background: var(--n2); border-color: var(--n4); }
.fe-main {
  flex: 1;
  min-width: 0;
  min-height: 4rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.5rem 0.7rem 1rem;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-lg);
}
.fe-texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.fe-nombre {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.1;
}
.fe-grupos { display: flex; flex-wrap: wrap; gap: 0.25rem 0.4rem; }
.fe-grupo {
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--n7);
}
.fe-pr { display: flex; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
.fe-seg { font-size: 1.6rem; }
.fe-unidad { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: var(--n6); text-transform: uppercase; line-height: 1; }
.fe-sinpr { font-family: var(--font-display); font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--n5); }
.fe-edit {
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
.fe-edit:hover { color: var(--n8); background: var(--n3); }
.fe-main:focus-visible, .fe-edit:focus-visible { outline: 2px solid var(--judge-white); outline-offset: -2px; }
</style>

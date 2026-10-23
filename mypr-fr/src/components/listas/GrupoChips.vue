<script setup lang="ts">
// Selector múltiple de grupos musculares como chips de alternancia (1 a `max`).
interface Grupo { GrupMuscularId: number; Nom: string }
const props = withDefaults(defineProps<{
  modelValue: (number | null)[];
  grupos: Grupo[];
  max?: number;
}>(), { max: 5 });
const emit = defineEmits<{ (e: 'update:modelValue', v: number[]): void }>();

const activos = () => props.modelValue.filter((g): g is number => g !== null);
const marcado = (id: number) => activos().includes(id);
const lleno = () => activos().length >= props.max;
const alternar = (id: number) => {
  const a = activos();
  if (a.includes(id)) emit('update:modelValue', a.filter(g => g !== id));
  else if (a.length < props.max) emit('update:modelValue', [...a, id]);
};
</script>

<template>
  <div>
    <div class="gc-grid" role="group" aria-label="Grupos musculares">
      <button
        v-for="g in grupos"
        :key="g.GrupMuscularId"
        type="button"
        class="gc-chip"
        :class="{ on: marcado(g.GrupMuscularId) }"
        :aria-pressed="marcado(g.GrupMuscularId)"
        :disabled="lleno() && !marcado(g.GrupMuscularId)"
        @click="alternar(g.GrupMuscularId)"
      >{{ g.Nom }}</button>
    </div>
    <p class="gc-help" :class="{ warn: activos().length === 0 }">
      <template v-if="activos().length === 0">Elige al menos un grupo muscular</template>
      <template v-else-if="activos().length >= max">Máximo de {{ max }} grupos alcanzado</template>
      <template v-else>{{ activos().length }} de {{ max }} grupos</template>
    </p>
  </div>
</template>

<style scoped>
.gc-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.gc-chip {
  min-height: var(--touch-min);
  padding: 0 0.9rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--n4);
  background: var(--n2);
  box-shadow: var(--bevel);
  color: var(--n7);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.gc-chip.on { background: var(--led-amber); border-color: var(--led-amber); color: var(--on-amber); }
.gc-chip:disabled { opacity: 0.35; cursor: not-allowed; }
.gc-chip:focus-visible { outline: 2px solid var(--judge-white); outline-offset: 2px; }
.gc-help { margin: 0.6rem 0 0; font-size: 0.8rem; color: var(--n6); }
.gc-help.warn { color: var(--led-amber); }
</style>

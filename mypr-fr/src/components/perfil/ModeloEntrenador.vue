<script setup lang="ts">
// Selector del modelo de IA del entrenador. El catálogo y la disponibilidad (clave del proveedor) los manda el servidor.
import { ref, computed, onMounted } from 'vue';
import { Check } from 'lucide-vue-next';
import { apiFetch } from '../../services/api';

interface ModeloIa {
  id: string;
  label: string;
  group: string;
  inputPrice: number;
  outputPrice: number;
  note: string | null;
  available: boolean;
  ttftMs: number | null;
  tokPerSec: number | null;
  samples: number;
}

const modelos = ref<ModeloIa[]>([]);
const elegido = ref('');
const cargando = ref(true);
const guardando = ref('');
const error = ref('');

// Coste orientativo de 1.000 mensajes: 5,5M tokens de entrada y 0,8M de salida (sin caché)
const costeMil = (m: ModeloIa) => m.inputPrice * 5.5 + m.outputPrice * 0.8;
const dinero = (n: number) => `${n.toFixed(2).replace('.', ',')} $`;
const precio = (n: number) => String(n).replace('.', ',');

const velocidad = (m: ModeloIa) => {
  if (!m.samples) return 'sin medir aún';
  const ttft = m.ttftMs === null ? '' : `${(m.ttftMs / 1000).toFixed(1).replace('.', ',')} s al primer texto`;
  const vel = m.tokPerSec === null ? '' : `${m.tokPerSec} tok/s`;
  return [ttft, vel].filter(Boolean).join(' · ') || 'sin medir aún';
};

const ordenados = computed(() => [...modelos.value].sort((a, b) => costeMil(a) - costeMil(b)));

const cargar = async () => {
  try {
    const r = await apiFetch<{ selected: string; models: ModeloIa[] }>('/api/getLlmModels', {});
    modelos.value = r.models;
    elegido.value = r.selected;
  } catch (e: any) {
    error.value = e?.message || 'No se pudieron cargar los modelos.';
  } finally {
    cargando.value = false;
  }
};

const elegir = async (m: ModeloIa) => {
  if (!m.available || m.id === elegido.value || guardando.value) return;
  const antes = elegido.value;
  elegido.value = m.id;
  guardando.value = m.id;
  error.value = '';
  try {
    await apiFetch('/api/updateLlmModel', { modelId: m.id });
  } catch (e: any) {
    elegido.value = antes;
    error.value = e?.message || 'No se pudo guardar el modelo.';
  } finally {
    guardando.value = '';
  }
};

onMounted(cargar);
</script>

<template>
  <section class="panel modelo" aria-labelledby="modelo-h">
    <h2 id="modelo-h" class="panel-title">Modelo del entrenador</h2>
    <p class="modelo-desc">Elige qué IA responde en el chat. El coste es orientativo por cada 1.000 mensajes; la velocidad es la media medida aquí en tus conversaciones.</p>

    <p v-if="cargando" class="modelo-estado" role="status">Cargando…</p>
    <div v-else class="lista" role="radiogroup" aria-labelledby="modelo-h">
      <button
        v-for="m in ordenados"
        :key="m.id"
        type="button"
        role="radio"
        class="fila"
        :class="{ activo: m.id === elegido }"
        :aria-checked="m.id === elegido"
        :disabled="!m.available"
        @click="elegir(m)"
      >
        <span class="marca" aria-hidden="true"><Check v-if="m.id === elegido" :size="16" :stroke-width="3" /></span>
        <span class="texto">
          <span class="nombre">{{ m.label }}</span>
          <span class="detalle">
            {{ m.group }} · {{ precio(m.inputPrice) }} / {{ precio(m.outputPrice) }} $ por millón
            <template v-if="!m.available"> · falta la clave del proveedor</template>
            <template v-else-if="m.note"> · {{ m.note }}</template>
          </span>
          <span class="velocidad">{{ velocidad(m) }}</span>
        </span>
        <span class="coste">≈ {{ dinero(costeMil(m)) }}</span>
      </button>
    </div>

    <p v-if="error" class="modelo-error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.panel-title {
  margin: 0 0 0.5rem; font-family: var(--font-display); font-size: 0.85rem; font-weight: 700;
  color: var(--n6); text-transform: uppercase; letter-spacing: 0.12em;
}
.modelo-desc { margin: 0 0 0.75rem; color: var(--n7); font-size: 0.9rem; }
.modelo-estado { margin: 0; color: var(--n6); }
.lista { display: flex; flex-direction: column; gap: 0.4rem; }
.fila {
  display: grid; grid-template-columns: 1.5rem 1fr auto; align-items: center; gap: 0.6rem;
  min-height: var(--touch-min); padding: 0.55rem 0.75rem; text-align: left;
  background: var(--n0); color: inherit; border: 1px solid var(--n3); border-radius: var(--radius-md); cursor: pointer;
}
.fila:hover:not(:disabled) { border-color: var(--n5); }
.fila.activo { border-color: var(--led-amber); }
.fila:disabled { opacity: 0.45; cursor: default; }
.marca {
  display: grid; place-items: center; width: 1.25rem; height: 1.25rem;
  border: 1px solid var(--n5); border-radius: 50%; color: var(--on-amber);
}
.fila.activo .marca { background: var(--led-amber); border-color: var(--led-amber); }
.texto { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.nombre { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--n8); }
.detalle { font-size: 0.8rem; color: var(--n6); }
.velocidad { font-size: 0.8rem; color: var(--n7); font-variant-numeric: tabular-nums; }
.coste { font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--n7); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fila.activo .coste { color: var(--led-amber); }
.modelo-error { margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--led-red); }
</style>

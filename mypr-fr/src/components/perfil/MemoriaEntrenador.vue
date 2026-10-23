<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { apiFetch } from '../../services/api';
import { eliminarConDeshacer } from '../../composables/useDeshacer';
import { Check, RotateCcw, Trash2, Plus } from 'lucide-vue-next';

interface CoachMemory {
  MemoryId: number;
  Kind: 'lesion' | 'objetivo' | 'preferencia' | 'nota';
  Text: string;
  Status: 'activa' | 'resuelta';
  CreatedAt: number;
}
const KIND_LABEL: Record<CoachMemory['Kind'], string> = {
  lesion: 'Lesión', objetivo: 'Objetivo', preferencia: 'Preferencia', nota: 'Nota'
};
const KINDS = Object.keys(KIND_LABEL) as CoachMemory['Kind'][];

const root = ref<HTMLElement | null>(null);
const memories = ref<CoachMemory[]>([]);
const memoriesLoading = ref(true);
const memoryError = ref('');
const memoryBusyId = ref<number | null>(null);

// Alta manual
const newKind = ref<CoachMemory['Kind']>('preferencia');
const newText = ref('');
const isAddingMemory = ref(false);

const activeMemories = computed(() => memories.value.filter(m => m.Status === 'activa'));
const resolvedMemories = computed(() => memories.value.filter(m => m.Status === 'resuelta'));
const formatMemoryDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('es-ES');

const loadMemories = async () => {
  try {
    memories.value = await apiFetch<CoachMemory[]>('/api/memory/list', {});
    memoryError.value = '';
  } catch (err) {
    console.error('Error loading memories', err);
    memoryError.value = 'No se pudo cargar la memoria del entrenador.';
  } finally {
    memoriesLoading.value = false;
  }
};

type MemoryPatch = { text?: string; status?: CoachMemory['Status']; kind?: CoachMemory['Kind'] };

const updateMemory = async (m: CoachMemory, patch: MemoryPatch) => {
  const previo = { Text: m.Text, Status: m.Status, Kind: m.Kind };
  // Optimista: el cambio se ve al instante y se deshace si falla
  if (patch.text !== undefined) m.Text = patch.text;
  if (patch.status !== undefined) m.Status = patch.status;
  if (patch.kind !== undefined) m.Kind = patch.kind;
  try {
    memoryBusyId.value = m.MemoryId;
    await apiFetch('/api/memory/update', { memoryId: m.MemoryId, ...patch });
    memoryError.value = '';
  } catch (err) {
    console.error('Error updating memory', err);
    Object.assign(m, previo);
    memoryError.value = 'No se pudo guardar el cambio. Inténtalo de nuevo.';
  } finally {
    memoryBusyId.value = null;
  }
};

// El texto se edita directamente: se guarda al salir del campo si ha cambiado
const onMemoryTextBlur = (m: CoachMemory, ev: Event) => {
  const el = ev.target as HTMLTextAreaElement;
  const text = el.value.trim();
  if (text === m.Text) return;
  if (text.length < 3) {
    el.value = m.Text; // demasiado corto: se restaura
    return;
  }
  updateMemory(m, { text });
};

const ajustarAltura = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  // border-box: scrollHeight no incluye el borde, hay que sumarlo
  el.style.height = el.scrollHeight + (el.offsetHeight - el.clientHeight) + 'px';
};
const autoGrow = (ev: Event) => ajustarAltura(ev.target as HTMLTextAreaElement);
const ajustarTodas = () =>
  root.value?.querySelectorAll<HTMLTextAreaElement>('textarea.memory-text').forEach(ajustarAltura);

// Cada memoria es un campo editable: al pintarse debe mostrar todo su texto, no solo una línea
watch(memories, () => nextTick(ajustarTodas), { deep: true });
// Las resueltas están dentro de un <details>: al abrirlo hay que recalcular las alturas
const onToggleResueltas = () => nextTick(ajustarTodas);

const addMemory = async () => {
  const text = newText.value.trim();
  if (text.length < 3) return;
  try {
    isAddingMemory.value = true;
    const { memoryId } = await apiFetch<{ memoryId: number }>('/api/memory/create', { kind: newKind.value, text });
    const now = Math.floor(Date.now() / 1000);
    memories.value = [{ MemoryId: memoryId, Kind: newKind.value, Text: text, Status: 'activa', CreatedAt: now }, ...memories.value];
    newText.value = '';
    memoryError.value = '';
  } catch (err) {
    console.error('Error creating memory', err);
    memoryError.value = 'No se pudo añadir. Inténtalo de nuevo.';
  } finally {
    isAddingMemory.value = false;
  }
};

const deleteMemory = (m: CoachMemory) => {
  const idx = memories.value.findIndex(x => x.MemoryId === m.MemoryId);
  eliminarConDeshacer({
    mensaje: 'Memoria borrada',
    aplicar: () => { memories.value = memories.value.filter(x => x.MemoryId !== m.MemoryId); },
    revertir: () => {
      if (memories.value.some(x => x.MemoryId === m.MemoryId)) return;
      const copia = [...memories.value];
      copia.splice(Math.min(Math.max(idx, 0), copia.length), 0, m);
      memories.value = copia;
    },
    confirmar: async () => { await apiFetch('/api/memory/delete', { memoryId: m.MemoryId }); },
  });
};

onMounted(loadMemories);

// TODO(entrevista): aquí irá el acceso a "Entrevista con tu entrenador" cuando exista la función.
</script>

<template>
  <section ref="root" class="panel mem" aria-labelledby="mem-h">
    <h2 id="mem-h" class="panel-title">Memoria del entrenador</h2>
    <p class="mem-intro">
      Lo que tu entrenador IA sabe de ti. Él la actualiza al hablar contigo; tú puedes cambiar cualquier cosa.
    </p>

    <form class="mem-add" @submit.prevent="addMemory">
      <label class="sr-only" for="mem-new-kind">Tipo</label>
      <select id="mem-new-kind" v-model="newKind" class="mem-kind" :class="'k-' + newKind">
        <option v-for="k in KINDS" :key="k" :value="k">{{ KIND_LABEL[k] }}</option>
      </select>
      <label class="sr-only" for="mem-new-text">Nuevo recuerdo</label>
      <input id="mem-new-text" v-model="newText" class="input mem-new-text" type="text" maxlength="500"
        autocomplete="off" placeholder="Ej.: entreno en casa, mancuernas hasta 24 kg" />
      <button type="submit" class="btn btn-primary mem-add-btn" aria-label="Añadir recuerdo"
        :disabled="isAddingMemory || newText.trim().length < 3">
        <Plus :size="20" :stroke-width="2.25" aria-hidden="true" />
      </button>
    </form>

    <p v-if="memoryError" id="mem-error" class="mem-error" role="alert">{{ memoryError }}</p>
    <p v-if="memoriesLoading" class="mem-note">Cargando...</p>
    <p v-else-if="memories.length === 0" class="mem-note">
      Aún no hay nada guardado. Añádelo arriba o cuéntaselo al entrenador en el chat.
    </p>

    <template v-else>
      <ul v-if="activeMemories.length" class="mem-list">
        <li v-for="m in activeMemories" :key="m.MemoryId" class="mem-item">
          <div class="mem-meta">
            <label class="sr-only" :for="'mem-kind-' + m.MemoryId">Tipo</label>
            <select :id="'mem-kind-' + m.MemoryId" class="mem-kind" :class="'k-' + m.Kind" :value="m.Kind"
              :disabled="memoryBusyId === m.MemoryId"
              @change="updateMemory(m, { kind: ($event.target as HTMLSelectElement).value as CoachMemory['Kind'] })">
              <option v-for="k in KINDS" :key="k" :value="k">{{ KIND_LABEL[k] }}</option>
            </select>
            <span class="mem-date">{{ formatMemoryDate(m.CreatedAt) }}</span>
            <span v-if="memoryBusyId === m.MemoryId" class="mem-saving" aria-live="polite">Guardando…</span>
          </div>
          <label class="sr-only" :for="'mem-' + m.MemoryId">Texto de la memoria</label>
          <textarea :id="'mem-' + m.MemoryId" class="memory-text" rows="1" maxlength="500" :value="m.Text"
            @focus="autoGrow" @input="autoGrow" @blur="onMemoryTextBlur(m, $event)"></textarea>
          <div class="mem-actions">
            <button type="button" class="mem-act" :disabled="memoryBusyId === m.MemoryId"
              @click="updateMemory(m, { status: 'resuelta' })">
              <Check :size="16" :stroke-width="2.25" aria-hidden="true" /> Marcar resuelta
            </button>
            <button type="button" class="mem-act mem-act--danger" :disabled="memoryBusyId === m.MemoryId"
              @click="deleteMemory(m)">
              <Trash2 :size="16" :stroke-width="2.25" aria-hidden="true" /> Borrar
            </button>
          </div>
        </li>
      </ul>

      <details v-if="resolvedMemories.length" class="mem-resolved" @toggle="onToggleResueltas">
        <summary>Resueltas ({{ resolvedMemories.length }})</summary>
        <ul class="mem-list">
          <li v-for="m in resolvedMemories" :key="m.MemoryId" class="mem-item resolved">
            <div class="mem-meta">
              <label class="sr-only" :for="'mem-kind-' + m.MemoryId">Tipo</label>
              <select :id="'mem-kind-' + m.MemoryId" class="mem-kind" :class="'k-' + m.Kind" :value="m.Kind"
                :disabled="memoryBusyId === m.MemoryId"
                @change="updateMemory(m, { kind: ($event.target as HTMLSelectElement).value as CoachMemory['Kind'] })">
                <option v-for="k in KINDS" :key="k" :value="k">{{ KIND_LABEL[k] }}</option>
              </select>
              <span class="mem-date">{{ formatMemoryDate(m.CreatedAt) }}</span>
              <span v-if="memoryBusyId === m.MemoryId" class="mem-saving" aria-live="polite">Guardando…</span>
            </div>
            <label class="sr-only" :for="'mem-' + m.MemoryId">Texto de la memoria</label>
            <textarea :id="'mem-' + m.MemoryId" class="memory-text" rows="1" maxlength="500" :value="m.Text"
              @focus="autoGrow" @input="autoGrow" @blur="onMemoryTextBlur(m, $event)"></textarea>
            <div class="mem-actions">
              <button type="button" class="mem-act" :disabled="memoryBusyId === m.MemoryId"
                @click="updateMemory(m, { status: 'activa' })">
                <RotateCcw :size="16" :stroke-width="2.25" aria-hidden="true" /> Reactivar
              </button>
              <button type="button" class="mem-act mem-act--danger" :disabled="memoryBusyId === m.MemoryId"
                @click="deleteMemory(m)">
                <Trash2 :size="16" :stroke-width="2.25" aria-hidden="true" /> Borrar
              </button>
            </div>
          </li>
        </ul>
      </details>
    </template>
  </section>
</template>

<style scoped>
.panel-title {
  margin: 0 0 0.5rem; font-family: var(--font-display); font-size: 0.85rem; font-weight: 700;
  color: var(--n6); text-transform: uppercase; letter-spacing: 0.12em;
}
.mem-intro { margin: 0 0 0.875rem; font-size: 0.875rem; color: var(--n7); }
.mem-note, .mem-error {
  margin: 0.75rem 0 0; padding: 0.75rem; border-radius: var(--radius-md);
  background: var(--n2); color: var(--n7); font-size: 0.875rem;
}
.mem-error { background: var(--led-red-dim); color: var(--led-red); }

.mem-add { display: flex; gap: 0.5rem; align-items: stretch; }
.mem-new-text { flex: 1; min-width: 0; min-height: var(--touch-min); font-size: 16px; }
.mem-add-btn { padding: 0; width: var(--touch-min); flex-shrink: 0; }

/* Chip de tipo: neutro; la lesión es la única que usa rojo (alarma) */
.mem-kind {
  appearance: none; -webkit-appearance: none; flex-shrink: 0;
  min-height: var(--touch-min); padding: 0 0.75rem; border-radius: var(--radius-sm);
  border: 1px solid var(--n4); background: var(--n2); color: var(--n7);
  font-family: var(--font-display); font-size: 0.85rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
}
.mem-meta .mem-kind { min-height: 32px; padding: 0 0.625rem; position: relative; }
.mem-kind.k-lesion { background: var(--led-red-dim); border-color: transparent; color: var(--led-red); }
.mem-kind:disabled { opacity: 0.6; cursor: default; }

.mem-list { list-style: none; margin: 0.875rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.mem-item { padding: 0.625rem 0.75rem 0.5rem; border: 1px solid var(--n3); border-radius: var(--radius-md); background: var(--n0); }
.mem-item.resolved { opacity: 0.6; }
.mem-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
.mem-date { font-family: var(--font-display); font-size: 0.8rem; letter-spacing: 0.08em; color: var(--n6); }
.mem-saving { margin-left: auto; font-size: 0.75rem; color: var(--n6); }

/* El texto es un campo editable que parece texto hasta que lo tocas */
textarea.memory-text {
  display: block; width: 100%; resize: none; overflow: hidden; box-sizing: border-box;
  padding: 0.5rem 0.625rem; margin: 0 0 0.25rem; border: 1px solid transparent; border-radius: var(--radius-sm);
  background: transparent; color: var(--n8); font-family: inherit; font-size: 16px; line-height: 1.4;
  transition: border-color 0.15s, background 0.15s;
}
textarea.memory-text:hover { border-color: var(--n4); }
textarea.memory-text:focus { outline: none; border-color: var(--led-amber); box-shadow: 0 0 0 1px var(--led-amber); background: var(--n1); }

.mem-actions { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-left: -0.5rem; }
.mem-act {
  display: inline-flex; align-items: center; gap: 0.375rem; min-height: var(--touch-min); padding: 0 0.625rem;
  background: none; border: 0; border-radius: var(--radius-sm); color: var(--n7); cursor: pointer;
  font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
}
.mem-act:hover:not(:disabled) { background: var(--n2); color: var(--n8); }
.mem-act--danger:hover:not(:disabled) { background: var(--led-red-dim); color: var(--led-red); }
.mem-act:disabled { opacity: 0.5; cursor: default; }

.mem-resolved { margin-top: 1rem; border-top: 1px solid var(--n3); }
.mem-resolved summary {
  display: flex; align-items: center; min-height: var(--touch-min); cursor: pointer; list-style: none;
  font-family: var(--font-display); font-size: 0.85rem; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--n6);
}
.mem-resolved summary::-webkit-details-marker { display: none; }
.mem-resolved summary::before { content: '+'; display: inline-block; width: 1.25rem; font-size: 1.1rem; }
.mem-resolved[open] summary::before { content: '\2212'; }
.mem-resolved .mem-list { margin-top: 0; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
</style>

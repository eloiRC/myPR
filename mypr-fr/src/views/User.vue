<script setup lang="ts">
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { apiFetch } from '../services/api';
import { useRestTimer, DURACIONES_PRESET, DURACION_MIN_SEG, DURACION_MAX_SEG } from '../composables/useRestTimer';

const router = useRouter();
const authStore = useAuthStore();

// Temporizador de descanso (ajustes por usuario, guardados en el servidor)
const rest = useRestTimer();
const esPersonalizada = ref(!DURACIONES_PRESET.includes(rest.duracionSeg.value));
const duracionPersonalizada = ref(rest.duracionSeg.value);
const valorSelector = computed(() => (esPersonalizada.value ? 'custom' : String(rest.duracionSeg.value)));
const onCambiarDuracion = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
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

const isLoading = ref(false);
const error = ref('');
const userInfo = ref(authStore.userInfo);

// --- Memoria del entrenador ---
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
const memories = ref<CoachMemory[]>([]);
const memoriesLoading = ref(true);
const memoryError = ref('');
const memoryBusyId = ref<number | null>(null);
const KINDS = Object.keys(KIND_LABEL) as CoachMemory['Kind'][];

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

// Cada memoria es un campo editable: al pintarse debe mostrar todo su texto, no solo una línea
watch(memories, () => nextTick(() => {
  document.querySelectorAll<HTMLTextAreaElement>('textarea.memory-text').forEach(ajustarAltura);
}), { deep: true });

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

const deleteMemory = async (m: CoachMemory) => {
  if (!confirm('¿Borrar esta memoria? El entrenador dejará de recordarla.')) return;
  try {
    memoryBusyId.value = m.MemoryId;
    await apiFetch('/api/memory/delete', { memoryId: m.MemoryId });
    memories.value = memories.value.filter(x => x.MemoryId !== m.MemoryId);
  } catch (err) {
    console.error('Error deleting memory', err);
    alert('No se pudo borrar la memoria');
  } finally {
    memoryBusyId.value = null;
  }
};

// Descargar historial completo de entrenos
const descargarHistorial = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    error.value = '';

    const data = await apiFetch<any[]>('/api/downloadHistorial', {});
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fecha = new Date().toISOString().split('T')[0];
    link.download = `historial_entrenos_${fecha}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    error.value = err.message || 'Error al descargar el historial';
    console.error('Error al descargar historial:', err);
    alert('Error al descargar el historial. Por favor, intenta de nuevo.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  rest.cargarDesdeServidor().then(() => {
    esPersonalizada.value = !DURACIONES_PRESET.includes(rest.duracionSeg.value);
    duracionPersonalizada.value = rest.duracionSeg.value;
  });
  if (!authStore.isAuthenticated) {
    router.push('/login');
  }
  userInfo.value = authStore.userInfo;
  loadMemories();
});
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>Mi perfil</h1>
      <button @click="router.push('/entrenos')" class="btn btn-secondary">&larr; Volver</button>
    </header>

    <div class="profile-grid">
      <div class="card card-elevated">
        <h2>Cuenta</h2>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value">{{ userInfo?.email || 'No disponible' }}</span>
        </div>
      </div>

      <div class="card">
        <h2>Acciones</h2>
        <button 
          @click="descargarHistorial" 
          class="btn btn-primary btn-download" 
          :disabled="isLoading"
        >
          <span v-if="isLoading">Descargando...</span>
          <span v-else>📥 Descargar historial de entrenos</span>
        </button>
        
        <p class="description">
          Descarga un archivo JSON con todo tu historial de entrenos, incluyendo todas las series y ejercicios realizados.
        </p>
       
      </div>

      <div class="card">
        <h2>Temporizador de descanso</h2>
        <label class="rest-row">
          <span>Activar temporizador</span>
          <input type="checkbox" role="switch" class="rest-switch" :checked="rest.habilitado.value" @change="rest.setHabilitado(($event.target as HTMLInputElement).checked)" />
        </label>
        <template v-if="rest.habilitado.value">
          <label class="rest-row">
            <span>Duración por defecto</span>
            <select class="input rest-select" :value="valorSelector" @change="onCambiarDuracion">
              <option v-for="d in DURACIONES_PRESET" :key="d" :value="String(d)">{{ d }} s</option>
              <option value="custom">Personalizada</option>
            </select>
          </label>
          <label v-if="esPersonalizada" class="rest-row">
            <span>Segundos ({{ DURACION_MIN_SEG }}-{{ DURACION_MAX_SEG }})</span>
            <input type="number" inputmode="numeric" class="input rest-select" :min="DURACION_MIN_SEG" :max="DURACION_MAX_SEG" :value="rest.duracionSeg.value" @change="onCambiarPersonalizada" />
          </label>
          <label class="rest-row">
            <span>Iniciar al completar una serie</span>
            <input type="checkbox" role="switch" class="rest-switch" :checked="rest.autoIniciar.value" @change="rest.setAutoIniciar(($event.target as HTMLInputElement).checked)" />
          </label>
        </template>
        <p v-if="rest.errorGuardado.value" class="rest-error" role="alert">{{ rest.errorGuardado.value }}</p>
      </div>

      <div class="card">
        <h2>Memoria del entrenador</h2>
        <p class="description memory-intro">
          Lo que tu entrenador IA sabe de ti: lesiones, objetivos y preferencias. Él la va actualizando al hablar contigo, y tú puedes cambiar cualquier cosa directamente.
        </p>

        <form class="memory-add" @submit.prevent="addMemory">
          <label class="sr-only" for="mem-new-kind">Tipo</label>
          <select id="mem-new-kind" v-model="newKind" class="memory-kind-select">
            <option v-for="k in KINDS" :key="k" :value="k">{{ KIND_LABEL[k] }}</option>
          </select>
          <label class="sr-only" for="mem-new-text">Nuevo recuerdo</label>
          <textarea id="mem-new-text" v-model="newText" class="prompt-input memory-textarea" rows="2" maxlength="500"
            placeholder="Ej.: Entreno en casa con mancuernas hasta 24 kg" @input="autoGrow"></textarea>
          <button type="submit" class="btn btn-primary btn-sm" :disabled="isAddingMemory || newText.trim().length < 3">
            {{ isAddingMemory ? 'Añadiendo…' : 'Añadir' }}
          </button>
        </form>

        <p v-if="memoryError" class="memory-error" role="alert">{{ memoryError }}</p>
        <p v-if="memoriesLoading" class="description">Cargando...</p>
        <p v-else-if="memories.length === 0" class="memory-empty">
          Aún no hay nada guardado. Añádelo arriba o cuéntaselo al entrenador en el chat.
        </p>

        <template v-else>
          <template v-for="grupo in [
            { titulo: 'Activas', items: activeMemories },
            { titulo: 'Resueltas', items: resolvedMemories }
          ]" :key="grupo.titulo">
            <section v-if="grupo.items.length" class="memory-group">
              <h3 class="memory-group-title">{{ grupo.titulo }} ({{ grupo.items.length }})</h3>
              <ul class="memory-list">
                <li v-for="m in grupo.items" :key="m.MemoryId" class="memory-item" :class="{ resolved: m.Status === 'resuelta' }">
                  <div class="memory-meta">
                    <label class="sr-only" :for="'mem-kind-' + m.MemoryId">Tipo</label>
                    <select :id="'mem-kind-' + m.MemoryId" class="memory-kind-select chip" :value="m.Kind"
                      :disabled="memoryBusyId === m.MemoryId"
                      @change="updateMemory(m, { kind: ($event.target as HTMLSelectElement).value as CoachMemory['Kind'] })">
                      <option v-for="k in KINDS" :key="k" :value="k">{{ KIND_LABEL[k] }}</option>
                    </select>
                    <span class="memory-date">{{ formatMemoryDate(m.CreatedAt) }}</span>
                    <span v-if="memoryBusyId === m.MemoryId" class="memory-saving" aria-live="polite">Guardando…</span>
                  </div>

                  <label class="sr-only" :for="'mem-' + m.MemoryId">Texto de la memoria</label>
                  <textarea :id="'mem-' + m.MemoryId" class="memory-text memory-textarea" rows="1" maxlength="500"
                    :value="m.Text" @focus="autoGrow" @input="autoGrow" @blur="onMemoryTextBlur(m, $event)"></textarea>

                  <div class="memory-actions">
                    <button class="btn btn-secondary btn-sm" :disabled="memoryBusyId === m.MemoryId" @click="updateMemory(m, { status: m.Status === 'activa' ? 'resuelta' : 'activa' })">
                      {{ m.Status === 'activa' ? 'Marcar resuelta' : 'Reactivar' }}
                    </button>
                    <button class="btn btn-quiet-danger btn-sm" :disabled="memoryBusyId === m.MemoryId" @click="deleteMemory(m)">Borrar</button>
                  </div>
                </li>
              </ul>
            </section>
          </template>
        </template>
      </div>

      <div v-if="error" class="state-box error">
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-intro { margin: 0 0 1rem; }
.memory-empty,
.memory-error {
  margin: 0;
  padding: 1rem;
  border-radius: var(--radius-lg);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.875rem;
}
.memory-error { color: var(--error); }
.memory-group + .memory-group { margin-top: 1.25rem; }
.memory-group-title {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.memory-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.memory-item {
  padding: 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}
.memory-item.resolved .memory-text { color: var(--text-muted); }
.memory-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.memory-date { font-size: 0.75rem; color: var(--text-muted); }
.memory-text { margin: 0 0 0.75rem; font-size: 0.9rem; line-height: 1.4; overflow-wrap: anywhere; }
.memory-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.memory-add {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.memory-add .memory-textarea { grid-column: 1 / -1; }
.memory-add .btn { grid-column: 1 / -1; justify-self: end; }
.memory-kind-select {
  min-height: 32px;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-strong);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}
select.memory-kind-select.chip { color: var(--accent-primary); }
.memory-saving { font-size: 0.75rem; color: var(--text-muted); margin-left: auto; }
/* El texto de cada memoria es un campo editable que parece texto hasta que lo tocas */
textarea.memory-text {
  display: block;
  width: 100%;
  resize: none;
  overflow: hidden;
  padding: 0.5rem 0.625rem;
  margin: 0 0 0.75rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.4;
  transition: border-color 0.2s, background 0.2s;
}
textarea.memory-text:hover { border-color: var(--border); }
textarea.memory-text:focus {
  outline: none;
  border-color: var(--accent-primary);
  background: var(--bg-primary);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.2);
}
@media (max-width: 640px) {
  textarea.memory-text, .memory-add .memory-textarea { font-size: 16px; }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.rest-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: var(--touch-min);
  font-size: 0.9rem;
  font-weight: 600;
}
.rest-select {
  width: 9rem;
  min-height: var(--touch-min);
}
.rest-switch {
  appearance: none;
  -webkit-appearance: none;
  flex-shrink: 0;
  position: relative;
  width: 52px;
  height: 32px;
  margin: 0;
  border-radius: var(--radius-full);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-strong);
  cursor: pointer;
  transition: background 0.2s ease;
}
.rest-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--text-secondary);
  transition: transform 0.2s ease, background 0.2s ease;
}
.rest-switch:checked { background: var(--accent-primary); }
.rest-switch:checked::after { transform: translateX(20px); background: var(--on-accent); }
.rest-switch:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.rest-error { margin: 0.5rem 0 0; font-size: 0.8rem; color: var(--error); }
.card h2 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.btn-download {
  width: 100%;
  margin-bottom: 0.75rem;
}
</style>




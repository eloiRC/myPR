<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { apiFetch } from '../services/api';
import { useRestTimer, DURACIONES_PRESET, DURACION_MIN_SEG, DURACION_MAX_SEG } from '../composables/useRestTimer';

const router = useRouter();
const authStore = useAuthStore();

// Temporizador de descanso (ajustes por dispositivo)
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
const chatbotPrompt = ref('');
const isSavingPrompt = ref(false);

// --- Garmin state ---
const garminEmail = ref('');
const garminPassword = ref('');
const garminConfigured = ref(false);
const garminSavedEmail = ref('');
const garminLastSync = ref('');
const isSavingGarmin = ref(false);
const isDeletingGarmin = ref(false);

// Cargar prompt del usuario
const loadUserPrompt = async () => {
  try {
    const data = await apiFetch<{ ChatbotPrompt?: string }>('/api/getUser', {});
    chatbotPrompt.value = data.ChatbotPrompt || '';
  } catch (err) {
    console.error('Error loading user prompt', err);
  }
};

// Cargar estado de Garmin
const loadGarminStatus = async () => {
  try {
    const data = await apiFetch<any>('/api/garmin/status', {});
    garminConfigured.value = data.configured;
    garminSavedEmail.value = data.garminEmail || '';
    garminLastSync.value = data.lastSync
      ? new Date(data.lastSync * 1000).toLocaleString('es-ES')
      : 'Nunca';
  } catch (err) {
    console.error('Error loading Garmin status', err);
  }
};

// Guardar credenciales Garmin
const saveGarmin = async () => {
  if (!garminEmail.value || !garminPassword.value) {
    alert('Completa email y contraseña de Garmin');
    return;
  }
  try {
    isSavingGarmin.value = true;
    await apiFetch('/api/garmin/credentials', {
      garminEmail: garminEmail.value,
      garminPassword: garminPassword.value
    });
    garminConfigured.value = true;
    garminSavedEmail.value = garminEmail.value;
    garminPassword.value = '';
    alert('Credenciales Garmin guardadas correctamente');
    loadGarminStatus();
  } catch (err) {
    console.error('Error saving Garmin', err);
    alert('Error al guardar credenciales Garmin');
  } finally {
    isSavingGarmin.value = false;
  }
};

// Eliminar credenciales Garmin
const deleteGarmin = async () => {
  if (!confirm('¿Eliminar credenciales Garmin? Dejarás de recibir datos automáticos.')) return;
  try {
    isDeletingGarmin.value = true;
    await apiFetch('/api/garmin/credentials/delete', {});
    garminConfigured.value = false;
    garminSavedEmail.value = '';
    garminLastSync.value = '';
    garminEmail.value = '';
    alert('Credenciales Garmin eliminadas');
  } catch (err) {
    console.error('Error deleting Garmin', err);
    alert('Error al eliminar credenciales');
  } finally {
    isDeletingGarmin.value = false;
  }
};

// Guardar prompt del usuario
const saveChatbotPrompt = async () => {
  try {
    isSavingPrompt.value = true;
    await apiFetch('/api/updateUser', { chatbotPrompt: chatbotPrompt.value });
    alert('Preferencias del chatbot guardadas correctamente');
  } catch (err) {
    console.error('Error saving prompt', err);
    alert('Error al guardar las preferencias');
  } finally {
    isSavingPrompt.value = false;
  }
};

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
const editingMemoryId = ref<number | null>(null);
const editingText = ref('');

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

const startEditMemory = (m: CoachMemory) => {
  editingMemoryId.value = m.MemoryId;
  editingText.value = m.Text;
};
const cancelEditMemory = () => {
  editingMemoryId.value = null;
  editingText.value = '';
};

const updateMemory = async (m: CoachMemory, patch: { text?: string; status?: CoachMemory['Status'] }) => {
  try {
    memoryBusyId.value = m.MemoryId;
    await apiFetch('/api/memory/update', { memoryId: m.MemoryId, ...patch });
    if (patch.text !== undefined) m.Text = patch.text;
    if (patch.status !== undefined) m.Status = patch.status;
    cancelEditMemory();
  } catch (err) {
    console.error('Error updating memory', err);
    alert('No se pudo actualizar la memoria');
  } finally {
    memoryBusyId.value = null;
  }
};

const saveMemoryText = (m: CoachMemory) => {
  const text = editingText.value.trim();
  if (text.length < 3) return;
  if (text === m.Text) return cancelEditMemory();
  updateMemory(m, { text });
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

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
  }
  userInfo.value = authStore.userInfo;
  loadUserPrompt();
  loadGarminStatus();
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
        <h2>🔗 Conectar Garmin</h2>
        <p class="description" style="margin-bottom: 1rem;">
          Introduce tus credenciales de Garmin Connect para importar automáticamente datos de recuperación (sueño, HRV, estrés) y actividades cardio (ciclismo, running). Los datos se sincronizarán una vez al día.
        </p>

        <div v-if="garminConfigured" class="garmin-status">
          <div class="status-row">
            <span class="label">Estado:</span>
            <span class="value status-ok">✅ Conectado</span>
          </div>
          <div class="status-row">
            <span class="label">Cuenta:</span>
            <span class="value">{{ garminSavedEmail }}</span>
          </div>
          <div class="status-row">
            <span class="label">Última sincronización:</span>
            <span class="value">{{ garminLastSync }}</span>
          </div>
          <button @click="deleteGarmin" class="btn btn-danger" :disabled="isDeletingGarmin" style="margin-top: 0.75rem;">
            <span v-if="isDeletingGarmin">Eliminando...</span>
            <span v-else>Desconectar Garmin</span>
          </button>
        </div>

        <div v-else class="garmin-form">
          <div class="form-group">
            <label for="garminEmail">Email Garmin</label>
            <input id="garminEmail" v-model="garminEmail" type="email" placeholder="tu@email.com" class="input" />
          </div>
          <div class="form-group">
            <label for="garminPassword">Contraseña Garmin</label>
            <input id="garminPassword" v-model="garminPassword" type="password" placeholder="••••••••" class="input" />
          </div>
          <button @click="saveGarmin" class="btn btn-primary" :disabled="isSavingGarmin">
            <span v-if="isSavingGarmin">Guardando...</span>
            <span v-else>💾 Guardar credenciales</span>
          </button>
        </div>
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
        <p class="description rest-hint">Se guarda solo en este dispositivo.</p>
      </div>

      <div class="card">
        <h2>Personalizar el entrenador IA</h2>
        <p class="description" style="margin-bottom: 1rem;">
          Define instrucciones específicas para tu entrenador AI (ej: "Tengo una lesión en la espalda", "Quiero priorizar fuerza", "Soy principiante").
        </p>
        <textarea 
          v-model="chatbotPrompt" 
          class="prompt-input" 
          placeholder="Escribe aquí tus objetivos, limitaciones o preferencias..."
          rows="4"
        ></textarea>
        <button 
          @click="saveChatbotPrompt" 
          class="btn btn-primary btn-save" 
          :disabled="isSavingPrompt"
        >
          <span v-if="isSavingPrompt">Guardando...</span>
          <span v-else>💾 Guardar preferencias</span>
        </button>
      </div>

      <div class="card">
        <h2>Memoria del entrenador</h2>
        <p class="description memory-intro">
          Lo que tu entrenador IA recuerda de ti entre conversaciones. Puedes editarlo, marcarlo como resuelto o borrarlo.
        </p>

        <p v-if="memoriesLoading" class="description">Cargando...</p>
        <p v-else-if="memoryError" class="memory-error" role="alert">{{ memoryError }}</p>
        <p v-else-if="memories.length === 0" class="memory-empty">
          Aún no hay nada guardado. Cuando le cuentes a tu entrenador una lesión, un objetivo o una preferencia importante, lo recordará aquí.
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
                    <span class="chip">{{ KIND_LABEL[m.Kind] }}</span>
                    <span class="memory-date">{{ formatMemoryDate(m.CreatedAt) }}</span>
                  </div>

                  <div v-if="editingMemoryId === m.MemoryId" class="memory-edit">
                    <label class="sr-only" :for="'mem-' + m.MemoryId">Texto de la memoria</label>
                    <textarea :id="'mem-' + m.MemoryId" v-model="editingText" class="prompt-input" rows="3" maxlength="500"></textarea>
                    <div class="memory-actions">
                      <button class="btn btn-primary btn-sm" :disabled="memoryBusyId === m.MemoryId || editingText.trim().length < 3" @click="saveMemoryText(m)">Guardar</button>
                      <button class="btn btn-secondary btn-sm" @click="cancelEditMemory">Cancelar</button>
                    </div>
                  </div>
                  <template v-else>
                    <p class="memory-text">{{ m.Text }}</p>
                    <div class="memory-actions">
                      <button class="btn btn-secondary btn-sm" :disabled="memoryBusyId === m.MemoryId" @click="startEditMemory(m)">Editar</button>
                      <button class="btn btn-secondary btn-sm" :disabled="memoryBusyId === m.MemoryId" @click="updateMemory(m, { status: m.Status === 'activa' ? 'resuelta' : 'activa' })">
                        {{ m.Status === 'activa' ? 'Marcar resuelta' : 'Reactivar' }}
                      </button>
                      <button class="btn btn-quiet-danger btn-sm" :disabled="memoryBusyId === m.MemoryId" @click="deleteMemory(m)">Borrar</button>
                    </div>
                  </template>
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
.memory-edit .prompt-input { width: 100%; margin-bottom: 0.5rem; }
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
.rest-hint { margin: 0.5rem 0 0; font-size: 0.8rem; color: var(--text-muted); }
.card h2 {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.btn-download,
.btn-save {
  width: 100%;
  margin-bottom: 0.75rem;
}

.garmin-form .form-group {
  margin-bottom: 0.75rem;
}

.garmin-form .form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: var(--text-secondary, #666);
}

.garmin-form .input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--bg-secondary, #fafafa);
  box-sizing: border-box;
}

.garmin-status .status-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  font-size: 0.9rem;
}

.garmin-status .status-ok {
  color: #22c55e;
  font-weight: 600;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  width: 100%;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>




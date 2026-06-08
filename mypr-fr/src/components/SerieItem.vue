<script setup lang="ts">
import { ref, computed } from 'vue';
import BuscadorSelect from './BuscadorSelect.vue';
import { apiFetch } from '../services/api';

// Props
interface Props {
  serie: any;
  ejercicios: any[];
  grupoMuscularNombre?: string[];
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits(['serieUpdated', 'serieDeleted', 'serieCompletadaToggled', 'openModalEjercicio', 'goToEjercicio', 'dragStart', 'drop']);

// Estado local
const isEditing = ref(false);
const isLoading = ref(false);
const serieEditada = ref({
  ejercicioId: 0,
  kg: 0,
  reps: 0
});

// Estado completado desde prop
const isCompleted = computed(() => (props.serie?.Completada ?? 0) === 1);

// --- Triple click / tap para marcar completado ---
const onCardClick = () => {
  if (isEditing.value || isLoading.value) return;
  if (navigator.vibrate) navigator.vibrate(50);
  emit('serieCompletadaToggled', props.serie.SerieId);
};

// --- Drag & Drop ---
const onDragStart = (e: DragEvent) => {
  if (isEditing.value || isLoading.value) return;
  e.dataTransfer?.setData('text/plain', String(props.serie.SerieId));
  emit('dragStart', props.serie.SerieId);
};

const onDrop = (e: DragEvent) => {
  e.preventDefault();
  emit('drop', props.serie.SerieId);
};

// Edición y lógica estándar...
const startEdit = () => {
  serieEditada.value = {
    ejercicioId: props.serie.ExerciciId,
    kg: props.serie.Kg,
    reps: props.serie.Reps
  };
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
};

const nombreEjercicio = computed(() => {
  return props.ejercicios.find(e => e.ExerciciId === props.serie.ExerciciId)?.Nom || 'Ejercicio desconocido';
});

const saveEdit = async () => {
  try {
    isLoading.value = true;
    const data = await apiFetch<any>('/api/editSerie', {
      serieId: props.serie.SerieId,
      entrenoId: props.serie.EntrenoId,
      exerciciId: serieEditada.value.ejercicioId,
      kg: serieEditada.value.kg,
      reps: serieEditada.value.reps
    });
    emit('serieUpdated', {
      data,
      serieId: props.serie.SerieId,
      entrenoId: props.serie.EntrenoId,
      exerciciId: serieEditada.value.ejercicioId,
      kg: serieEditada.value.kg,
      reps: serieEditada.value.reps
    });
    isEditing.value = false;
  } catch (error) {
    console.error(error);
    alert('Error al guardar los cambios');
  } finally {
    isLoading.value = false;
  }
};

const deleteSerie = async () => {
  if(!confirm('¿Estás seguro de que quieres eliminar esta serie?')) return;
  try {
    isLoading.value = true;
    const data = await apiFetch<any>('/api/deleteSerie', { serieId: props.serie.SerieId });
    emit('serieDeleted', {
      data,
      serieId: props.serie.SerieId,
      entrenoId: props.serie.EntrenoId,
      exerciciId: props.serie.ExerciciId,
      carga: props.serie.Carga
    });
  } catch (error) {
    console.error(error);
    alert('Error al eliminar la serie');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div 
    class="serie-card" 
    :class="{ 
      'editing': isEditing, 
      'serie-done': isCompleted, 
      'serie-pending': !isCompleted,
    }"
    draggable="true"
    @dragstart="onDragStart"
    @dragover.prevent
    @drop.prevent="onDrop"
    @click="onCardClick"
  >
    <!-- MODO VISUALIZACIÓN -->
    <template v-if="!isEditing">
      <div class="serie-info" :class="{ 'text-dimmed': isCompleted }">
        <h3>
          <div @click.stop="$emit('goToEjercicio', serie.ExerciciId)" style="cursor: pointer;">
            {{ nombreEjercicio }}
          </div>
        </h3>
        <p class="serie-stats">
          <span class="kg">{{ serie.Kg }} kg</span> x 
          <span class="reps">{{ serie.Reps }} reps</span> = 
          <span class="carga">{{ serie.Carga }} kg</span>
        </p>
        <p v-if="serie.PR" class="pr-badge">PR 🏆</p>
        

      </div>
      
      <div class="serie-right-column" :class="{ 'text-dimmed': isCompleted }">
<div class="grupo-muscular-container" v-if="grupoMuscularNombre && grupoMuscularNombre.length">
  <span v-for="(nom, i) in grupoMuscularNombre" :key="i" class="grupo-muscular">{{ nom }}</span>
</div>
        <div class="serie-actions">
          <button class="btn btn-secondary btn-sm" @click.stop="startEdit" :disabled="isLoading">Editar</button>
          <button class="btn btn-danger btn-sm" @click.stop="deleteSerie" :disabled="isLoading">Eliminar</button>
        </div>
      </div>
    </template>

    <!-- MODO EDICIÓN -->
    <template v-else>
      <div class="serie-info edit-mode-full" @mousedown.stop @touchstart.stop>
        <div class="edit-form">
          <div class="form-group">
            <label>Ejercicio:</label>
            <div class="input-with-button">
              <BuscadorSelect v-model="serieEditada.ejercicioId" :options="ejercicios" label="Nom" :reduce="(e: any) => e.ExerciciId" />
              <button type="button" class="btn btn-secondary btn-sm" @click="$emit('openModalEjercicio')">+</button>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Peso:</label><input type="number" v-model.number="serieEditada.kg" class="form-control" step="0.5"></div>
            <div class="form-group"><label>Reps:</label><input type="number" v-model.number="serieEditada.reps" class="form-control"></div>
          </div>
          <div class="edit-actions">
            <button class="btn btn-primary" @click="saveEdit">Guardar</button>
            <button class="btn btn-secondary" @click="cancelEdit">Cancelar</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style src="../styles/detalle-entreno.css"></style>

<style scoped>
.serie-card {
  position: relative;
  background-color: var(--bg-secondary);
  user-select: none; /* Importante para evitar selección de texto al mantener pulsado */
  transition: transform 0.1s, background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid transparent;
}

.serie-done {
  background: linear-gradient(0deg, rgba(15,139,141,0.10) 0%, rgba(15,139,141,0.06) 100%);
  border-color: rgba(15, 139, 141, 0.5);
  border-left: 6px solid #0f8b8d;
  box-shadow: inset 0 0 0 999px rgba(15, 139, 141, 0.05);
}

.serie-pending {
  background-color: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.12);
}

.text-dimmed {
  opacity: 0.38;
  transition: opacity 0.3s ease;
}

.press-hint {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
  font-style: italic;
  opacity: 0.6;
}


@media (max-width: 480px) {
  .serie-actions {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
  .serie-actions button {
    width: 100%;
    padding: 0.4rem 0.5rem;
  }
  .serie-right-column {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 80px;
  }
}
</style>

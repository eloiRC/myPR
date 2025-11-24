<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import authService from '../services/auth';
import BuscadorSelect from './BuscadorSelect.vue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Props
interface Props {
  serie: any;
  ejercicios: any[];
  grupoMuscularNombre?: string;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits(['serieUpdated', 'serieDeleted', 'openModalEjercicio', 'goToEjercicio']);

// Estado local
const isEditing = ref(false);
const isLoading = ref(false);
const serieEditada = ref({
  ejercicioId: 0,
  kg: 0,
  reps: 0
});

// Estado completado
const isCompleted = ref(false);

// Variables para Long Press
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isPressing = ref(false); // Para efecto visual al presionar
const isTouchInteraction = ref(false); // Para evitar conflictos touch/mouse

// Variables para detectar scroll
const startX = ref(0);
const startY = ref(0);

// Cargar estado
onMounted(() => {
  if (props.serie && props.serie.SerieId) {
    const key = `serie_completed_${props.serie.SerieId}`;
    const savedState = localStorage.getItem(key);
    
    if (savedState !== null) {
      isCompleted.value = savedState === 'true';
    } else if (props.serie._isManualInput) {
      isCompleted.value = true;
      localStorage.setItem(key, 'true');
    }
  }
});

watch(isCompleted, (newValue) => {
  if (props.serie && props.serie.SerieId) {
    if (newValue) {
      localStorage.setItem(`serie_completed_${props.serie.SerieId}`, 'true');
    } else {
      localStorage.removeItem(`serie_completed_${props.serie.SerieId}`);
    }
  }
});

// --- Lógica de Long Press ---
const startLongPress = () => {
  isPressing.value = true;
  longPressTimer.value = setTimeout(() => {
    // Acción al completar el tiempo (800ms)
    isCompleted.value = !isCompleted.value;
    if (navigator.vibrate) navigator.vibrate(50); // Vibración háptica
    isPressing.value = false; // Terminar efecto visual
  }, 800); 
};

const cancelLongPress = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  isPressing.value = false;
};

// --- Eventos Touch (Móvil) ---
const onTouchStart = (e: TouchEvent) => {
  if (isEditing.value) return; 
  isTouchInteraction.value = true; 
  
  // Guardamos posición inicial para detectar si hace scroll luego
  startX.value = e.touches[0].clientX;
  startY.value = e.touches[0].clientY;
  
  startLongPress();
};

const onTouchMove = (e: TouchEvent) => {
  if (!isPressing.value) return;
  
  const currentX = e.touches[0].clientX;
  const currentY = e.touches[0].clientY;
  
  // Si se mueve más de 10px en cualquier dirección, es que está haciendo scroll o moviendo el dedo
  // Cancelamos el long press
  if (Math.abs(currentX - startX.value) > 10 || Math.abs(currentY - startY.value) > 10) {
    cancelLongPress();
  }
};

const onTouchEnd = () => {
  cancelLongPress(); // Si levanta el dedo antes de los 800ms, cancela
};

// --- Eventos Mouse (PC) ---
const onMouseDown = () => {
  if (isEditing.value || isTouchInteraction.value) return;
  startLongPress();
};

const onMouseUp = () => {
  cancelLongPress();
};

const onMouseLeave = () => {
  cancelLongPress();
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
    const token = authService.getToken();
    const response = await fetch(API_URL + '/api/editSerie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        serieId: props.serie.SerieId,
        entrenoId: props.serie.EntrenoId,
        exerciciId: serieEditada.value.ejercicioId,
        kg: serieEditada.value.kg,
        reps: serieEditada.value.reps
      })
    });
    if (!response.ok) throw new Error('Error al editar la serie');
    const data = await response.json();
    emit('serieUpdated', { data, exerciciId: serieEditada.value.ejercicioId, kg: serieEditada.value.kg });
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
    const token = authService.getToken();
    const response = await fetch(API_URL + '/api/deleteSerie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, serieId: props.serie.SerieId })
    });
    if (!response.ok) throw new Error('Error al eliminar');
    localStorage.removeItem(`serie_completed_${props.serie.SerieId}`);
    emit('serieDeleted');
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
      'pressing': isPressing 
    }"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
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
        <div class="grupo-muscular-container" v-if="grupoMuscularNombre">
          <span class="grupo-muscular">{{ grupoMuscularNombre }}</span>
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
  transition: transform 0.1s, background-color 0.3s ease, border-color 0.3s ease;
}

/* Efecto visual al mantener pulsado: se encoge un poco */
.pressing {
  transform: scale(0.97) !important;
  background-color: rgba(255, 255, 255, 0.05); /* Ligeramente más claro/oscuro según tema */
}

.serie-done {
  background-color: rgba(15, 139, 141, 0.08);
  border-color: rgba(15, 139, 141, 0.3);
}

.text-dimmed {
  opacity: 0.5;
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
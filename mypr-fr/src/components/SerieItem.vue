<script setup lang="ts">
import { ref, computed } from 'vue';
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

// Estado local para edición
const isEditing = ref(false);
const isLoading = ref(false);
const serieEditada = ref({
  ejercicioId: 0,
  kg: 0,
  reps: 0
});

// Iniciar edición
const startEdit = () => {
  serieEditada.value = {
    ejercicioId: props.serie.ExerciciId,
    kg: props.serie.Kg,
    reps: props.serie.Reps
  };
  isEditing.value = true;
};

// Cancelar edición
const cancelEdit = () => {
  isEditing.value = false;
};

// Calcular nombre del ejercicio
const nombreEjercicio = computed(() => {
  return props.ejercicios.find(e => e.ExerciciId === props.serie.ExerciciId)?.Nom || 'Ejercicio desconocido';
});

// Guardar cambios
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
    
    // Emitir evento al padre con los datos actualizados
    emit('serieUpdated', { 
      data, 
      exerciciId: serieEditada.value.ejercicioId, // Enviamos el ID por si cambió para calcular PR en padre
      kg: serieEditada.value.kg
    });
    
    isEditing.value = false;
  } catch (error) {
    console.error('Error al editar serie:', error);
    alert('Error al guardar los cambios');
  } finally {
    isLoading.value = false;
  }
};

// Eliminar serie
const deleteSerie = async () => {
  if(!confirm('¿Seguro que quieres borrar esta serie?')) return;

  try {
    isLoading.value = true;
    const token = authService.getToken();
    
    const response = await fetch(API_URL + '/api/deleteSerie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, serieId: props.serie.SerieId })
    });

    if (!response.ok) throw new Error('Error al eliminar la serie');
    
    // Emitir evento para que el padre recargue o actualice totales
    emit('serieDeleted');
  } catch (error) {
    console.error('Error al eliminar serie:', error);
    alert('Error al eliminar la serie');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="serie-card" :class="{ 'editing': isEditing }">
    <!-- MODO VISUALIZACIÓN -->
    <template v-if="!isEditing">
      <div class="serie-info">
        <h3>
          <div @click="$emit('goToEjercicio', serie.ExerciciId)" style="cursor: pointer;">
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
      
      <div class="serie-right-column">
        <div class="grupo-muscular-container" v-if="grupoMuscularNombre">
          <span class="grupo-muscular">{{ grupoMuscularNombre }}</span>
        </div>
        <div class="serie-actions">
          <button class="btn btn-secondary btn-sm" @click="startEdit" :disabled="isLoading">Editar</button>
          <button class="btn btn-danger btn-sm" @click="deleteSerie" :disabled="isLoading">Eliminar</button>
        </div>
      </div>
    </template>

    <!-- MODO EDICIÓN -->
    <template v-else>
      <div class="serie-info edit-mode-full">
        <div class="edit-form">
          <div class="form-group">
            <label>Ejercicio:</label>
            <div class="input-with-button">
              <BuscadorSelect
                v-model="serieEditada.ejercicioId"
                :options="ejercicios"
                label="Nom"
                :reduce="(e: any) => e.ExerciciId"
                placeholder="Busca un ejercicio..."
              />
              <button type="button" class="btn btn-secondary btn-sm ejercicio-btn" @click="$emit('openModalEjercicio')" title="Nuevo">+</button>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Peso (kg):</label>
              <input type="number" v-model.number="serieEditada.kg" class="form-control" min="0" step="0.5">
            </div>
            <div class="form-group">
              <label>Reps:</label>
              <input type="number" v-model.number="serieEditada.reps" class="form-control" min="1" step="1">
            </div>
          </div>
          
          <div class="form-group">
            <div class="carga-calculada">
              <span class="label">Total:</span>
              <span class="value">{{ serieEditada.kg * serieEditada.reps }} kg</span>
            </div>
          </div>
          
          <div class="edit-actions">
            <button class="btn btn-primary" @click="saveEdit" :disabled="isLoading">
              {{ isLoading ? '...' : 'Guardar' }}
            </button>
            <button class="btn btn-secondary" @click="cancelEdit" :disabled="isLoading">Cancelar</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style src="../styles/detalle-entreno.css"></style>
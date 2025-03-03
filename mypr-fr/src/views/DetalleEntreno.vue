<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import authService from '../services/auth';

// Definir interfaces para los datos
interface Entreno {
  EntrenoId: number;
  UserId: number;
  Data: number;
  CargaTotal: number;
}

interface Serie {
  SerieId: number;
  UserId: number;
  EntrenoId: number;
  ExerciciId: number;
  Kg: number;
  Reps: number;
  Carga: number;
  PR: boolean;
  Data: number;
}

interface Ejercicio {
  ExerciciId: number;
  Nom: string;
  UserId: number;
  PR: number;
  GrupMuscular1: number | null;
  GrupMuscular2: number | null;
  GrupMuscular3: number | null;
  GrupMuscular4: number | null;
  GrupMuscular5: number | null;
}

// Definir la interfaz para los grupos musculares
interface GrupoMuscular {
  GrupMuscularId: number;
  Nom: string;
}

// Obtener el ID del entreno de los parámetros de la ruta
const route = useRoute();
const router = useRouter();
const entrenoId = Number(route.params.id);

// Estados reactivos
const entreno = ref<Entreno | null>(null);
const series = ref<Serie[]>([]);
const ejercicios = ref<Ejercicio[]>([]);
const gruposMusculares = ref<GrupoMuscular[]>([]);
const isLoading = ref(true);
const error = ref('');
const showForm = ref(false);
const editandoSerie = ref<Serie | null>(null);
const showPrAlert = ref(false);
const prMessage = ref('');
const showEjercicioModal = ref(false);
const nuevoEjercicio = ref({
  Nom: '',
  gruposMusculares: [] as number[]
});
const guardandoEjercicio = ref(false);
const errorGuardado = ref('');

// Estado del formulario
const nuevaSerie = ref({
  ejercicioId: 0,
  kg: 0,
  reps: 0
});

// Estado para edición de serie
const serieEditada = ref({
  ejercicioId: 0,
  kg: 0,
  reps: 0
});

// Calcular la carga de la nueva serie
const cargaCalculada = computed(() => {
  return nuevaSerie.value.kg * nuevaSerie.value.reps;
});

// Obtener ejercicios únicos en el entreno
const ejerciciosUnicos = computed(() => {
  const ids = new Set(series.value.map(serie => serie.ExerciciId));
  return Array.from(ids);
});

// Mapa de ejercicios a grupos musculares
const ejercicioGrupoMap = computed(() => {
  const map = new Map();
  
  if (ejercicios.value.length === 0 || gruposMusculares.value.length === 0) {
    return map;
  }
  
  ejercicios.value.forEach(ejercicio => {
    if (ejercicio.GrupMuscular1) {
      const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === ejercicio.GrupMuscular1);
      if (grupo) {
        map.set(ejercicio.ExerciciId, grupo.Nom);
      }
    }
  });
  
  return map;
});

// Formatear la fecha para mostrarla en formato legible
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Formatear la fecha para el título (formato más compacto)
const formatDateTitle = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Cargar los detalles del entreno
const loadEntreno = async () => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    
    // Obtener el token de autenticación
    const token = authService.getToken();
    
    // Hacer la solicitud a la API
    const response = await fetch('http://localhost:8787/api/getEntreno', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        entrenoId
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar los detalles del entreno');
    }
    
    const data = await response.json();
    console.log('Datos del entreno recibidos:', data);
    entreno.value = data.entreno[0];
    series.value = data.series;
    
    // Cargar los ejercicios
    await loadEjercicios();
    
    // Cargar los grupos musculares si no están cargados
    if (gruposMusculares.value.length === 0) {
      await loadGruposMusculares();
    }
  } catch (err: any) {
    error.value = err.message || 'Error al cargar los detalles del entreno';
    console.error('Error al cargar detalles del entreno:', err);
  } finally {
    isLoading.value = false;
  }
};

// Cargar los ejercicios disponibles
const loadEjercicios = async () => {
  try {
    const token = authService.getToken();
    
    const response = await fetch('http://localhost:8787/api/getExercicis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar los ejercicios');
    }
    
    const data = await response.json();
    ejercicios.value = data;
    
    // Si hay ejercicios, seleccionar el primero por defecto
    if (ejercicios.value.length > 0) {
      nuevaSerie.value.ejercicioId = ejercicios.value[0].ExerciciId;
    }
  } catch (err: any) {
    console.error('Error al cargar ejercicios:', err);
  }
};

// Cargar los grupos musculares
const loadGruposMusculares = async () => {
  try {
    const token = authService.getToken();
    
    const response = await fetch('http://localhost:8787/api/getGrupsMusculars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar los grupos musculares');
    }
    
    const data = await response.json();
    console.log('Grupos musculares recibidos:', data);
    
    if (Array.isArray(data)) {
      gruposMusculares.value = data;
    } else if (data && typeof data === 'object') {
      gruposMusculares.value = data.results || [];
    } else {
      gruposMusculares.value = [];
      console.error('Formato de datos inesperado:', data);
    }
  } catch (err: any) {
    console.error('Error al cargar grupos musculares:', err);
  }
};

// Guardar una nueva serie
const guardarSerie = async () => {
  if (nuevaSerie.value.ejercicioId === 0 || nuevaSerie.value.kg <= 0 || nuevaSerie.value.reps <= 0) {
    error.value = 'Por favor, completa todos los campos correctamente';
    return;
  }
  
  try {
    isLoading.value = true;
    
    const token = authService.getToken();
    
    const response = await fetch('http://localhost:8787/api/novaSerie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        entrenoId,
        exerciciId: nuevaSerie.value.ejercicioId,
        kg: nuevaSerie.value.kg,
        reps: nuevaSerie.value.reps
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al guardar la serie');
    }
    
    const data = await response.json();
    console.log('Serie guardada:', data);
    
    if (data.newPr) {
      const ejercicio = ejercicios.value.find(e => e.ExerciciId === nuevaSerie.value.ejercicioId);
      prMessage.value = `¡Felicidades! Has conseguido un nuevo PR en ${ejercicio?.Nom || 'el ejercicio'} con ${nuevaSerie.value.kg}kg`;
      showPrAlert.value = true;
      setTimeout(() => {
        showPrAlert.value = false;
      }, 5000);
    }
    
    // Resetear el formulario
    nuevaSerie.value = {
      ejercicioId: ejercicios.value.length > 0 ? ejercicios.value[0].ExerciciId : 0,
      kg: 0,
      reps: 0
    };
    
    // Ocultar el formulario
    showForm.value = false;
    
    // Recargar los datos del entreno
    await loadEntreno();
  } catch (err: any) {
    error.value = err.message || 'Error al guardar la serie';
    console.error('Error al guardar serie:', err);
  } finally {
    isLoading.value = false;
  }
};

// Mostrar/ocultar el formulario
const toggleForm = () => {
  showForm.value = !showForm.value;
};

// Función para abrir el modal
const abrirModalEjercicio = () => {
  nuevoEjercicio.value = {
    Nom: '',
    gruposMusculares: []
  };
  errorGuardado.value = '';
  showEjercicioModal.value = true;
  
  // Cargar grupos musculares si no están cargados
  if (gruposMusculares.value.length === 0) {
    cargarGruposMusculares();
  }
};

// Función para cerrar el modal
const cerrarModalEjercicio = () => {
  showEjercicioModal.value = false;
};

// Función para cargar grupos musculares
const cargarGruposMusculares = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/GruposMuscular`);
    if (!response.ok) {
      throw new Error('Error al cargar grupos musculares');
    }
    gruposMusculares.value = await response.json();
  } catch (error) {
    console.error('Error al cargar grupos musculares:', error);
  }
};

// Función para guardar el nuevo ejercicio
const guardarNuevoEjercicio = async () => {
  // Validar que haya al menos un grupo muscular seleccionado
  if (nuevoEjercicio.value.gruposMusculares.length === 0) {
    errorGuardado.value = 'Debes seleccionar al menos un grupo muscular';
    return;
  }
  
  // Validar que no haya más de 5 grupos musculares seleccionados
  if (nuevoEjercicio.value.gruposMusculares.length > 5) {
    errorGuardado.value = 'No puedes seleccionar más de 5 grupos musculares';
    return;
  }
  
  // Validar que el nombre no esté vacío
  if (!nuevoEjercicio.value.Nom.trim()) {
    errorGuardado.value = 'El nombre del ejercicio no puede estar vacío';
    return;
  }
  
  guardandoEjercicio.value = true;
  errorGuardado.value = '';
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Ejercicios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Nom: nuevoEjercicio.value.Nom,
        GruposMusculares: nuevoEjercicio.value.gruposMusculares
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al guardar el ejercicio');
    }
    
    const nuevoEjercicioGuardado = await response.json();
    
    // Añadir el nuevo ejercicio a la lista de ejercicios
    ejercicios.value.push(nuevoEjercicioGuardado);
    
    // Seleccionar automáticamente el nuevo ejercicio
    if (editandoSerie.value) {
      // Si estamos editando una serie, actualizar el ejercicio en la edición
      serieEditada.value.ejercicioId = nuevoEjercicioGuardado.ExerciciId;
    } else {
      // Si estamos creando una nueva serie, actualizar el ejercicio en el formulario
      nuevaSerie.value.ejercicioId = nuevoEjercicioGuardado.ExerciciId;
    }
    
    // Cerrar el modal
    cerrarModalEjercicio();
    
    // Mostrar mensaje de éxito
    alert('Ejercicio creado correctamente');
  } catch (error) {
    console.error('Error al guardar el ejercicio:', error);
    errorGuardado.value = 'Error al guardar el ejercicio. Inténtalo de nuevo.';
  } finally {
    guardandoEjercicio.value = false;
  }
};

// Volver a la lista de entrenos
const volverAEntrenos = () => {
  router.push('/entrenos');
};

// Iniciar edición de serie
const iniciarEdicionSerie = (serie: Serie) => {
  editandoSerie.value = serie;
  serieEditada.value = {
    ejercicioId: serie.ExerciciId,
    kg: serie.Kg,
    reps: serie.Reps
  };
};

// Cancelar edición de serie
const cancelarEdicionSerie = () => {
  editandoSerie.value = null;
  serieEditada.value = {
    ejercicioId: 0,
    kg: 0,
    reps: 0
  };
};

// Guardar edición de serie
const guardarEdicionSerie = async () => {
  if (!editandoSerie.value) return;
  
  try {
    isLoading.value = true;
    const token = authService.getToken();
    
    const response = await fetch('http://localhost:8787/api/editSerie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        serieId: editandoSerie.value.SerieId,
        entrenoId: editandoSerie.value.EntrenoId,
        exerciciId: serieEditada.value.ejercicioId,
        kg: serieEditada.value.kg,
        reps: serieEditada.value.reps
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al editar la serie');
    }
    
    const data = await response.json();
    console.log('Serie editada:', data);
    
    if (data.newPr) {
      const ejercicio = ejercicios.value.find(e => e.ExerciciId === editandoSerie.value?.ExerciciId);
      prMessage.value = `¡Felicidades! Has conseguido un nuevo PR en ${ejercicio?.Nom || 'el ejercicio'} con ${serieEditada.value.kg}kg`;
      showPrAlert.value = true;
      setTimeout(() => {
        showPrAlert.value = false;
      }, 5000);
    }
    
    // Resetear el estado de edición
    editandoSerie.value = null;
    serieEditada.value = {
      ejercicioId: 0,
      kg: 0,
      reps: 0
    };
    
    // Recargar los datos del entreno
    await loadEntreno();
  } catch (err: any) {
    error.value = err.message || 'Error al editar la serie';
    console.error('Error al editar serie:', err);
  } finally {
    isLoading.value = false;
  }
};

// Cargar los detalles al montar el componente
onMounted(loadEntreno);
</script>

<template>
  <div class="detalle-entreno-container">
    <header class="header">
      <button @click="volverAEntrenos" class="btn btn-secondary">
        &larr; Volver
      </button>
      <h1 v-if="entreno" class="entreno-title">{{ formatDateTitle(entreno.Data) }}</h1>
    </header>
    
    <div v-if="showPrAlert" class="pr-alert">
      {{ prMessage }}
    </div>
    
    <div v-if="isLoading" class="loading">
      <p>Cargando detalles del entreno...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadEntreno" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="entreno" class="entreno-details">
      <div class="entreno-info-card">
        <div class="info-row">
          <span class="label">Entreno #{{ entreno.EntrenoId }}</span>
          <span class="value">{{ formatDate(entreno.Data) }}</span>
        </div>
        <div class="info-row">
          <span class="label">Carga total:</span>
          <span class="value">{{ entreno.CargaTotal }} kg</span>
        </div>
        <div class="info-row">
          <span class="label">Series:</span>
          <span class="value">{{ series.length }}</span>
        </div>
        <div class="info-row">
          <span class="label">Ejercicios:</span>
          <span class="value">{{ ejerciciosUnicos.length }}</span>
        </div>
      </div>
      
      <h2>Series</h2>
      
      <div v-if="!showForm && series.length >= 0" class="add-serie">
        <button @click="toggleForm" class="btn btn-primary btn-lg">Agregar nueva serie</button>
      </div>
      
      <!-- Formulario para añadir nueva serie -->
      <div v-if="showForm" class="serie-card new-serie-card">
        <div class="serie-info">
          <h3>Añadir nueva serie</h3>
          <form @submit.prevent="guardarSerie" class="serie-form">
            <div class="form-group">
              <label for="ejercicio">Ejercicio:</label>
              <div class="input-with-button">
                <select v-model="nuevaSerie.ejercicioId" id="ejercicio" class="form-control" required>
                  <option value="" disabled>Selecciona un ejercicio</option>
                  <option v-for="ejercicio in ejercicios" :key="ejercicio.ExerciciId" :value="ejercicio.ExerciciId">
                    {{ ejercicio.Nom }}
                  </option>
                </select>
                <button type="button" class="btn btn-secondary btn-sm ejercicio-btn" @click="abrirModalEjercicio" title="Crear nuevo ejercicio">+</button>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="kg">Peso (kg):</label>
                <input 
                  type="number" 
                  id="kg" 
                  v-model.number="nuevaSerie.kg" 
                  class="form-control" 
                  min="0" 
                  step="0.5"
                  required
                >
              </div>
              
              <div class="form-group">
                <label for="reps">Repeticiones:</label>
                <input 
                  type="number" 
                  id="reps" 
                  v-model.number="nuevaSerie.reps" 
                  class="form-control" 
                  min="1" 
                  step="1"
                  required
                >
              </div>
            </div>
            
            <div class="form-group" v-if="nuevaSerie.kg > 0 && nuevaSerie.reps > 0">
              <div class="carga-calculada">
                <span class="label">Carga total:</span>
                <span class="value">{{ cargaCalculada }} kg</span>
              </div>
            </div>
            
            <div class="form-actions nueva-serie-actions">
              <button type="button" @click="toggleForm" class="btn btn-secondary">Cancelar</button>
              <button type="button" @click="guardarSerie" class="btn btn-primary" :disabled="isLoading">
                {{ isLoading ? 'Guardando...' : 'Guardar Serie' }}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div v-if="series.length === 0 && !showForm" class="no-series">
        <p>No hay series registradas para este entreno.</p>
      </div>
      
      <div v-else-if="series.length > 0" class="series-list">
        <div v-for="serie in series" :key="serie.SerieId" class="serie-card" :class="{ 'editing': editandoSerie?.SerieId === serie.SerieId }">
          <div class="serie-info">
            <h3>
              {{ ejercicios.find(e => e.ExerciciId === serie.ExerciciId)?.Nom || `Ejercicio desconocido` }}
            </h3>
            
            <!-- Modo visualización -->
            <template v-if="editandoSerie?.SerieId !== serie.SerieId">
              <p class="serie-stats">
                <span class="kg">{{ serie.Kg }} kg</span> x 
                <span class="reps">{{ serie.Reps }} reps</span> = 
                <span class="carga">{{ serie.Carga }} kg</span>
              </p>
              <p v-if="serie.PR" class="pr-badge">PR 🏆</p>
            </template>
            
            <!-- Modo edición -->
            <template v-else>
              <div class="edit-form">
                <div class="form-group">
                  <label for="edit-ejercicio">Ejercicio:</label>
                  <div class="input-with-button">
                    <select 
                      id="edit-ejercicio" 
                      v-model="serieEditada.ejercicioId" 
                      class="form-control" 
                      required
                    >
                      <option v-for="ejercicio in ejercicios" :key="ejercicio.ExerciciId" :value="ejercicio.ExerciciId">
                        {{ ejercicio.Nom }}
                      </option>
                    </select>
                    <button type="button" class="btn btn-secondary btn-sm ejercicio-btn" @click="abrirModalEjercicio" title="Crear nuevo ejercicio">+</button>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="edit-kg">Peso (kg):</label>
                    <input 
                      type="number" 
                      id="edit-kg" 
                      v-model.number="serieEditada.kg" 
                      class="form-control" 
                      min="0" 
                      step="0.5"
                      required
                    >
                  </div>
                  
                  <div class="form-group">
                    <label for="edit-reps">Repeticiones:</label>
                    <input 
                      type="number" 
                      id="edit-reps" 
                      v-model.number="serieEditada.reps" 
                      class="form-control" 
                      min="1" 
                      step="1"
                      required
                    >
                  </div>
                </div>
                
                <div class="form-group" v-if="serieEditada.kg > 0 && serieEditada.reps > 0">
                  <div class="carga-calculada">
                    <span class="label">Carga total:</span>
                    <span class="value">{{ serieEditada.kg * serieEditada.reps }} kg</span>
                  </div>
                </div>
                
                <div class="edit-actions">
                  <button class="btn btn-primary" @click="guardarEdicionSerie">Guardar</button>
                  <button class="btn btn-secondary" @click="cancelarEdicionSerie">Cancelar</button>
                </div>
              </div>
            </template>
          </div>
          
          <div class="serie-right-column" v-if="editandoSerie?.SerieId !== serie.SerieId">
            <div class="grupo-muscular-container" v-if="ejercicioGrupoMap.has(serie.ExerciciId)">
              <span class="grupo-muscular">
                {{ ejercicioGrupoMap.get(serie.ExerciciId) }}
              </span>
            </div>
            <div class="serie-actions">
              <button class="btn btn-secondary btn-sm" @click="iniciarEdicionSerie(serie)">Editar</button>
              <button class="btn btn-danger btn-sm">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Modal para crear ejercicio -->
  <div v-if="showEjercicioModal" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3>Crear nuevo ejercicio</h3>
        <button type="button" class="btn-close" @click="cerrarModalEjercicio">&times;</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="guardarNuevoEjercicio" class="ejercicio-form">
          <div class="form-group">
            <label for="nombre">Nombre del ejercicio:</label>
            <input 
              type="text" 
              id="nombre" 
              v-model="nuevoEjercicio.Nom" 
              class="form-control" 
              required
              placeholder="Ej: Press de banca"
            >
          </div>
          
          <div class="form-group">
            <label>Grupos musculares:</label>
            <div class="grupos-seleccion">
              <div v-for="grupo in gruposMusculares" :key="grupo.GrupMuscularId" class="grupo-checkbox">
                <input 
                  type="checkbox" 
                  :id="'grupo-' + grupo.GrupMuscularId" 
                  :value="grupo.GrupMuscularId" 
                  v-model="nuevoEjercicio.gruposMusculares"
                  class="checkbox-input"
                >
                <label :for="'grupo-' + grupo.GrupMuscularId" class="checkbox-label">{{ grupo.Nom }}</label>
              </div>
            </div>
            <span class="select-help">Selecciona entre 1 y 5 grupos musculares</span>
            <p v-if="errorGuardado" class="error-message">{{ errorGuardado }}</p>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="cerrarModalEjercicio" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="guardandoEjercicio">
              {{ guardandoEjercicio ? 'Guardando...' : 'Guardar Ejercicio' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detalle-entreno-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  padding-bottom: 80px; /* Espacio para el footer */
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
}

.entreno-title {
  margin-left: auto;
  margin-bottom: 0;
  font-size: 1.5rem;
}

.entreno-info-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-weight: 500;
  color: var(--text-secondary);
}

.value {
  font-weight: 600;
  font-size: 1.1rem;
}

h2 {
  margin: 2rem 0 1.5rem;
  font-size: 1.5rem;
}

.serie-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--color-cobalt-blue);
  border-bottom: 2px solid rgba(25, 86, 200, 0.3);
  padding-bottom: 0.5rem;
  width: 100%;
}

.grupo-muscular-container {
  margin-bottom: 1rem;
}

.grupo-muscular {
  display: inline-block;
  background-color: transparent;
  color: #777;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
}

.serie-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border);
}

.serie-info {
  width: 100%;
}

.serie-info p {
  margin: 0.5rem 0;
}

.serie-stats {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.kg, .reps, .carga {
  font-weight: 600;
}

.carga {
  color: var(--color-cobalt-blue);
}

.pr-badge {
  display: inline-block;
  background-color: var(--color-razzmatazz);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.serie-right-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.serie-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.btn-danger {
  background-color: var(--color-razzmatazz);
  color: white;
  border: none;
}

.btn-danger:hover {
  background-color: #c02a5d;
}

.add-serie {
  margin-bottom: 1.5rem;
  width: 100%;
}

.add-serie button {
  width: 100%;
  display: block;
  box-sizing: border-box;
  text-align: center;
  padding: 1rem;
  height: auto;
  border-radius: 8px;
  font-size: 1.25rem;
  font-weight: 600;
  background-color: var(--color-cobalt-blue);
  color: white;
  border: none;
  transition: background-color 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-serie button:hover {
  background-color: #1648a0;
}

.new-serie-card {
  margin-bottom: 2rem;
  border: 2px dashed var(--color-cobalt-blue);
  background-color: rgba(25, 86, 200, 0.05);
  display: block;
  padding: 1.5rem;
}

.loading, .error, .no-series {
  text-align: center;
  padding: 2rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
  margin: 1.5rem 0;
}

.error {
  color: var(--error);
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--color-cobalt-blue);
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: #1648a0;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--color-cobalt-blue);
  color: var(--color-cobalt-blue);
}

.btn-secondary:hover {
  background-color: rgba(25, 86, 200, 0.1);
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
}

/* Estilos para el formulario */
.form-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border);
}

.serie-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-control {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  height: 38px;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: var(--color-cobalt-blue);
  box-shadow: 0 0 0 2px rgba(25, 86, 200, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.nueva-serie-actions {
  justify-content: center;
  margin-top: 2rem;
}

.nueva-serie-actions button {
  width: 50%;
  padding: 0.75rem 0;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 6px;
}

.carga-calculada {
  background-color: var(--bg-primary);
  padding: 0.75rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.carga-calculada .value {
  color: var(--color-cobalt-blue);
  font-size: 1.1rem;
}

.edit-form {
  margin-top: 1rem;
  width: 100%;
}

.edit-form .form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.edit-form .form-group {
  flex: 1;
}

.edit-form .form-control {
  width: 100%;
}

.edit-form .carga-calculada {
  margin-top: 0.5rem;
}

.edit-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.edit-actions button {
  width: 50%;
  padding: 0.75rem 0;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 6px;
}

.ml-2 {
  margin-left: 0.5rem;
}

.ejercicio-select-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.select-wrapper {
  width: 100%;
}

.input-with-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.input-with-button .form-control {
  flex: 1;
}

.ejercicio-btn {
  height: 38px;
  min-width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  font-size: 1.2rem;
  line-height: 1;
  border-radius: 4px;
  position: relative;
  top: -1px; /* Ajuste fino para alinear con el selector */
  align-self: flex-start; /* Alinear con la parte superior del selector */
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-container {
  background-color: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.btn-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.grupos-seleccion {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.grupo-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-input {
  margin: 0;
}

.checkbox-label {
  cursor: pointer;
}

.select-help {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.pr-alert {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: var(--color-razzmatazz);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.serie-card.editing {
  display: block;
  padding: 1.5rem;
}
</style> 
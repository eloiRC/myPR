<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import authService from '../services/auth';
import { formatearTexto, guardarNuevoEjercicio } from '../utils/ejercicioUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Usa la variable de entorno o el valor por defecto

// Definir la interfaz para un ejercicio
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

const router = useRouter();
const route = useRoute();
const ejercicios = ref<Ejercicio[]>([]);
const gruposMusculares = ref<GrupoMuscular[]>([]);
const isLoading = ref(true);
const error = ref('');
const showForm = ref(false);
const filtroGrupoMuscular = ref<number | null>(null);
const editandoEjercicio = ref<Ejercicio | null>(null);

// Estado del formulario
const nuevoEjercicio = ref({
  nombre: '',
  gruposMusculares: [] as (number | null)[]
});

// Estado para edición de ejercicio
const ejercicioEditado = ref({
  nombre: '',
  gruposMusculares: [] as (number | null)[]
});

// Ejercicios filtrados por grupo muscular
const ejerciciosFiltrados = computed(() => {
  if (filtroGrupoMuscular.value === null) {
    return ejercicios.value;
  }
  
  return ejercicios.value.filter(ejercicio => 
    ejercicio.GrupMuscular1 === filtroGrupoMuscular.value ||
    ejercicio.GrupMuscular2 === filtroGrupoMuscular.value ||
    ejercicio.GrupMuscular3 === filtroGrupoMuscular.value ||
    ejercicio.GrupMuscular4 === filtroGrupoMuscular.value ||
    ejercicio.GrupMuscular5 === filtroGrupoMuscular.value
  );
});

// Limpiar el filtro
const limpiarFiltro = () => {
  filtroGrupoMuscular.value = null;
};

// Cargar los ejercicios
const loadEjercicios = async () => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    
    // Obtener el token de autenticación
    const token = authService.getToken();
    
    // Hacer la solicitud a la API
    const response = await fetch(API_URL+'/api/getExercicis', {
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
    console.log('Ejercicios recibidos:', data);
    
    // Asegurarnos de que los datos recibidos sean un array
    if (Array.isArray(data)) {
      ejercicios.value = data;
    } else if (data && typeof data === 'object') {
      ejercicios.value = data.results || [];
    } else {
      ejercicios.value = [];
      console.error('Formato de datos inesperado:', data);
    }
    
    // Cargar los grupos musculares
    await loadGruposMusculares();
  } catch (err: any) {
    error.value = err.message || 'Error al cargar los ejercicios';
    console.error('Error al cargar ejercicios:', err);
  } finally {
    isLoading.value = false;
  }
};

// Cargar los grupos musculares
const loadGruposMusculares = async () => {
  try {
    const token = authService.getToken();
    
    const response = await fetch(API_URL+'/api/getGrupsMusculars', {
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

// Mostrar/ocultar el formulario
const toggleForm = () => {
  showForm.value = !showForm.value;
  
  // Resetear el formulario si se cierra
  if (!showForm.value) {
    resetForm();
  }
};

// Resetear el formulario
const resetForm = () => {
  nuevoEjercicio.value = {
    nombre: '',
    gruposMusculares: []
  };
};

// Función para guardar el nuevo ejercicio
const guardarEjercicio = async () => {
  isLoading.value = true;
  error.value = '';
  
  await guardarNuevoEjercicio(
    {
      Nom: nuevoEjercicio.value.nombre,
      gruposMusculares: nuevoEjercicio.value.gruposMusculares.filter((gm): gm is number => gm !== null)
    },
    async () => {
      // Recargar la lista de ejercicios
      await loadEjercicios();
      
      // Resetear el formulario y ocultar
      resetForm();
      showForm.value = false;
      
      // Mostrar mensaje de éxito
      error.value = '¡Ejercicio creado correctamente!';
      setTimeout(() => {
        error.value = '';
      }, 3000);
    },
    (errorMessage) => {
      error.value = errorMessage;
    }
  );
  
  isLoading.value = false;
};

// Volver a la lista de entrenos
const volverAEntrenos = () => {
  router.push('/entrenos');
};

// Obtener el nombre del grupo muscular
const getNombreGrupoMuscular = (id: number | null): string => {
  if (!id) return '';
  const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === id);
  return grupo ? grupo.Nom : `ID: ${id}`;
};

// Iniciar edición de ejercicio
const iniciarEdicionEjercicio = (ejercicio: Ejercicio) => {
  editandoEjercicio.value = ejercicio;
  
  // Preparar el estado de edición
  ejercicioEditado.value.nombre = ejercicio.Nom;
  ejercicioEditado.value.gruposMusculares = [];
  
  // Añadir los grupos musculares existentes
  if (ejercicio.GrupMuscular1) ejercicioEditado.value.gruposMusculares.push(ejercicio.GrupMuscular1);
  if (ejercicio.GrupMuscular2) ejercicioEditado.value.gruposMusculares.push(ejercicio.GrupMuscular2);
  if (ejercicio.GrupMuscular3) ejercicioEditado.value.gruposMusculares.push(ejercicio.GrupMuscular3);
  if (ejercicio.GrupMuscular4) ejercicioEditado.value.gruposMusculares.push(ejercicio.GrupMuscular4);
  if (ejercicio.GrupMuscular5) ejercicioEditado.value.gruposMusculares.push(ejercicio.GrupMuscular5);
};

// Cancelar edición de ejercicio
const cancelarEdicionEjercicio = () => {
  editandoEjercicio.value = null;
  ejercicioEditado.value = {
    nombre: '',
    gruposMusculares: []
  };
};

// Guardar edición de ejercicio
const guardarEdicionEjercicio = async () => {
  if (!editandoEjercicio.value) return;
  
  if (!ejercicioEditado.value.nombre.trim()) {
    error.value = 'Por favor, introduce un nombre para el ejercicio';
    return;
  }
  
  if (ejercicioEditado.value.gruposMusculares.length === 0) {
    error.value = 'Por favor, selecciona al menos un grupo muscular';
    return;
  }
  
  try {
    isLoading.value = true;
    
    const token = authService.getToken();
    
    // Preparar los datos para la solicitud
    const requestData = {
      token,
      exerciciId: editandoEjercicio.value.ExerciciId,
      nom: formatearTexto(ejercicioEditado.value.nombre),
      grupsMusculars: ejercicioEditado.value.gruposMusculares.filter(gm => gm !== null)
    };
    
    console.log('Datos a enviar para edición:', requestData);
    
    // Hacer la solicitud a la API
    const response = await fetch(API_URL+'/api/editExercici', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error('Error al editar el ejercicio');
    }
    
    const data = await response.json();
    console.log('Ejercicio editado:', data);
    
    // Resetear el estado de edición
    cancelarEdicionEjercicio();
    
    // Recargar los ejercicios
    await loadEjercicios();
  } catch (err: any) {
    error.value = err.message || 'Error al editar el ejercicio';
    console.error('Error al editar ejercicio:', err);
  } finally {
    isLoading.value = false;
  }
};

// Ir al detalle de un ejercicio
const verDetalleEjercicio = (ejercicioId: number) => {
  router.push(`/ejercicio/${ejercicioId}`);
};

// Cargar los ejercicios al montar el componente
onMounted(() => {
  loadEjercicios();
  
  // Si hay un parámetro 'nuevo' en la URL, mostrar el formulario
  if (route.query.nuevo === 'true') {
    showForm.value = true;
  }
});
</script>

<template>
  <div class="ejercicios-container">
    <header class="header">
      <button @click="volverAEntrenos" class="btn btn-secondary">
        &larr; Volver
      </button>
      <h1 class="ejercicios-title">Mis Ejercicios</h1>
    </header>
    
    <div class="actions">
      <button @click="toggleForm" class="btn btn-primary">
        {{ showForm ? 'Cancelar' : 'Nuevo Ejercicio' }}
      </button>
    </div>
    
    <!-- Filtro por grupo muscular -->
    <div class="filtro-container">
      <h3>Filtrar por grupo muscular</h3>
      <div class="filtro-grupos">
        <button 
          class="btn-filtro" 
          :class="{ 'btn-filtro-activo': filtroGrupoMuscular === null }"
          @click="limpiarFiltro"
        >
          Todos
        </button>
        <button 
          v-for="grupo in gruposMusculares" 
          :key="grupo.GrupMuscularId"
          class="btn-filtro"
          :class="{ 'btn-filtro-activo': filtroGrupoMuscular === grupo.GrupMuscularId }"
          @click="filtroGrupoMuscular = grupo.GrupMuscularId"
        >
          {{ grupo.Nom }}
        </button>
      </div>
    </div>
    
    <!-- Formulario para añadir nuevo ejercicio -->
    <div v-if="showForm" class="form-container">
      <h2>Nuevo Ejercicio</h2>
      <form @submit.prevent="guardarEjercicio" class="ejercicio-form">
        <div class="form-group">
          <label for="nombre">Nombre del ejercicio:</label>
          <input 
            type="text" 
            id="nombre" 
            v-model="nuevoEjercicio.nombre" 
            class="form-control" 
            required
            placeholder="Ej: Press de banca"
          >
        </div>
        
        <div class="form-group">
          <label for="grupos-musculares">Grupos musculares (selecciona entre 1 y 5):</label>
          <div class="grupos-seleccion">
            <div 
              v-for="grupo in gruposMusculares" 
              :key="grupo.GrupMuscularId" 
              class="grupo-checkbox"
            >
              <input 
                type="checkbox" 
                :id="'grupo-' + grupo.GrupMuscularId" 
                :value="grupo.GrupMuscularId" 
                v-model="nuevoEjercicio.gruposMusculares"
                class="checkbox-input"
                :disabled="nuevoEjercicio.gruposMusculares.length >= 5 && !nuevoEjercicio.gruposMusculares.includes(grupo.GrupMuscularId)"
              >
              <label :for="'grupo-' + grupo.GrupMuscularId" class="checkbox-label">{{ grupo.Nom }}</label>
            </div>
          </div>
          <small class="select-help" v-if="nuevoEjercicio.gruposMusculares.length === 0">
            Debes seleccionar al menos un grupo muscular
          </small>
          <small class="select-help" v-else-if="nuevoEjercicio.gruposMusculares.length === 5">
            Has alcanzado el máximo de 5 grupos musculares
          </small>
          <small class="select-help" v-else>
            Has seleccionado {{ nuevoEjercicio.gruposMusculares.length }} de 5 grupos musculares posibles
          </small>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="toggleForm" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="isLoading">
            {{ isLoading ? 'Guardando...' : 'Guardar Ejercicio' }}
          </button>
        </div>
      </form>
    </div>
    
    <div v-if="isLoading" class="loading">
      <p>Cargando ejercicios...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadEjercicios" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="ejercicios.length === 0" class="no-ejercicios">
      <p class="no-ejercicios-text">No tienes ejercicios registrados.</p>
      <button @click="toggleForm" class="btn btn-primary btn-lg">Crear tu primer ejercicio</button>
    </div>
    
    <div v-else>
      <h2>Lista de Ejercicios</h2>
      
      <div class="resultados-filtro">
        <p>
          Mostrando {{ ejerciciosFiltrados.length }} 
          {{ ejerciciosFiltrados.length === 1 ? 'ejercicio' : 'ejercicios' }}
          {{ filtroGrupoMuscular !== null ? 'para el grupo muscular: ' + getNombreGrupoMuscular(filtroGrupoMuscular) : '' }}
        </p>
      </div>
      
      <div class="ejercicios-list">
        <div 
          v-for="ejercicio in ejerciciosFiltrados" 
          :key="ejercicio.ExerciciId" 
          class="ejercicio-card"
          @click="verDetalleEjercicio(ejercicio.ExerciciId)"
        >
          <!-- Modo visualización -->
          <div v-if="editandoEjercicio?.ExerciciId !== ejercicio.ExerciciId" class="ejercicio-info">
            <h3>{{ ejercicio.Nom }}</h3>
            <p v-if="ejercicio.PR > 0" class="pr-info">
              PR: <strong>{{ ejercicio.PR }} kg</strong>
            </p>
            <div class="grupos-musculares">
              <span v-if="ejercicio.GrupMuscular1" class="grupo-tag">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular1) }}
              </span>
              <span v-if="ejercicio.GrupMuscular2" class="grupo-tag">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular2) }}
              </span>
              <span v-if="ejercicio.GrupMuscular3" class="grupo-tag">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular3) }}
              </span>
              <span v-if="ejercicio.GrupMuscular4" class="grupo-tag">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular4) }}
              </span>
              <span v-if="ejercicio.GrupMuscular5" class="grupo-tag">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular5) }}
              </span>
            </div>
          </div>
          
          <!-- Modo edición -->
          <div v-else class="ejercicio-info edit-mode">
            <div class="form-group">
              <label for="edit-nombre">Nombre del ejercicio:</label>
              <input 
                type="text" 
                id="edit-nombre" 
                v-model="ejercicioEditado.nombre" 
                class="form-control" 
                required
                placeholder="Nombre del ejercicio"
              >
            </div>
            
            <div class="form-group">
              <label>Grupos musculares (selecciona entre 1 y 5):</label>
              <div class="grupos-seleccion">
                <div 
                  v-for="grupo in gruposMusculares" 
                  :key="grupo.GrupMuscularId" 
                  class="grupo-checkbox"
                >
                  <input 
                    type="checkbox" 
                    :id="'edit-grupo-' + grupo.GrupMuscularId" 
                    :value="grupo.GrupMuscularId" 
                    v-model="ejercicioEditado.gruposMusculares"
                    class="checkbox-input"
                    :disabled="ejercicioEditado.gruposMusculares.length >= 5 && !ejercicioEditado.gruposMusculares.includes(grupo.GrupMuscularId)"
                  >
                  <label :for="'edit-grupo-' + grupo.GrupMuscularId" class="checkbox-label">{{ grupo.Nom }}</label>
                </div>
              </div>
              <small class="select-help" v-if="ejercicioEditado.gruposMusculares.length === 0">
                Debes seleccionar al menos un grupo muscular
              </small>
              <small class="select-help" v-else-if="ejercicioEditado.gruposMusculares.length === 5">
                Has alcanzado el máximo de 5 grupos musculares
              </small>
              <small class="select-help" v-else>
                Has seleccionado {{ ejercicioEditado.gruposMusculares.length }} de 5 grupos musculares posibles
              </small>
            </div>
          </div>
          
          <div class="ejercicio-actions">
            <template v-if="editandoEjercicio?.ExerciciId !== ejercicio.ExerciciId">
              <button class="btn btn-secondary btn-sm" @click="iniciarEdicionEjercicio(ejercicio)">Editar</button>
            </template>
            <template v-else>
              <button class="btn btn-primary btn-sm" @click="guardarEdicionEjercicio">Guardar</button>
              <button class="btn btn-secondary btn-sm" @click="cancelarEdicionEjercicio">Cancelar</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ejercicios-container {
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

.ejercicios-title {
  margin-left: auto;
  margin-bottom: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}

h2 {
  margin: 2rem 0 1.5rem;
  font-size: 1.5rem;
}

.ejercicio-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--border);
}

.ejercicio-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.ejercicio-info {
  flex: 1;
}

.ejercicio-info h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.pr-info {
  margin: 0.5rem 0;
  color: var(--color-razzmatazz);
}

.grupos-musculares {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.grupo-tag {
  background-color: var(--bg-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  border: 1px solid var(--border);
}

.ejercicio-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.loading, .error, .no-ejercicios {
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

/* Estilos para el formulario */
.form-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border);
}

.ejercicio-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-control {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
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

.grupos-seleccion {
  display: flex;
  flex-wrap: wrap;
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

.select-multiple {
  height: auto;
  min-height: 120px;
}

.select-help {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* Estilos para el filtro */
.filtro-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border);
}

.filtro-container h3 {
  margin-bottom: 1rem;
}

.filtro-grupos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn-filtro {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid var(--color-cobalt-blue);
  background-color: transparent;
  color: var(--color-cobalt-blue);
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-filtro:hover {
  background-color: rgba(25, 86, 200, 0.1);
}

.btn-filtro-activo {
  background-color: var(--color-cobalt-blue);
  color: white;
}

.resultados-filtro {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* Estilos para el modo de edición */
.edit-mode {
  width: 100%;
  padding: 0.5rem;
}

.edit-mode .form-group {
  margin-bottom: 1rem;
}

.edit-mode .form-control {
  width: 100%;
}

.edit-mode .grupos-seleccion {
  margin-top: 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.ejercicio-card {
  transition: all 0.3s ease;
}

.ejercicio-card:has(.edit-mode) {
  flex-direction: column;
  align-items: stretch;
}

.ejercicio-card:has(.edit-mode) .ejercicio-actions {
  align-self: flex-end;
  margin-top: 1rem;
}

.no-ejercicios {
  text-align: center;
  padding: 3rem 2rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
  margin: 1.5rem 0;
}

.no-ejercicios-text {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.btn-lg {
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
}
</style> 
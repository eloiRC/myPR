<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { formatearTexto, guardarNuevoEjercicio } from '../utils/ejercicioUtils';
import { apiFetch } from '../services/api';

const authStore = useAuthStore();

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

const showEjercicioAlert = ref(false);
const showAlert = ref(false);
const alertMessage = ref('');
const ejercicioAlertMessage = ref('');
const router = useRouter();
const route = useRoute();
const ejercicios = ref<Ejercicio[]>([]);
const gruposMusculares = ref<GrupoMuscular[]>([]);
const isLoading = ref(true);
const error = ref('');
const showForm = ref(false);
const busquedaNombre = ref('');
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
  let resultado = ejercicios.value;

  if (filtroGrupoMuscular.value !== null) {
    resultado = resultado.filter(ejercicio =>
      ejercicio.GrupMuscular1 === filtroGrupoMuscular.value ||
      ejercicio.GrupMuscular2 === filtroGrupoMuscular.value ||
      ejercicio.GrupMuscular3 === filtroGrupoMuscular.value ||
      ejercicio.GrupMuscular4 === filtroGrupoMuscular.value ||
      ejercicio.GrupMuscular5 === filtroGrupoMuscular.value
    );
  }

  const term = busquedaNombre.value.trim().toLowerCase();
  if (term) {
    resultado = resultado.filter(ejercicio =>
      ejercicio.Nom.toLowerCase().includes(term)
    );
  }

  return resultado;
});

// Limpiar el filtro
const limpiarFiltro = () => {
  filtroGrupoMuscular.value = null;
};

// Cargar los ejercicios
const loadEjercicios = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    
    const data = await apiFetch<any[]>('/api/getExercicis', {});

    if (Array.isArray(data)) {
      ejercicios.value = data;
    } else {
      ejercicios.value = [];
    }

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
    const data = await apiFetch<any[]>('/api/getGrupsMusculars', {});
    gruposMusculares.value = Array.isArray(data) ? data : [];
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
function capitalize(s:string){
  return s.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

}
const newExercici = async () => {
  
  const newName= capitalize(nuevoEjercicio.value.nombre)
  var duplicated = false
  console.log(newName)
ejercicios.value.forEach(value => {
  const nom = value.Nom
  if(nom==newName){
    console.log(true)
    alertWindow('Este nombre de ejercicio ya existe')
    duplicated=true
  }
});
if(!duplicated){
  guardarEjercicio()
}
}

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
      // Mostrar mensaje de éxito
      ejercicioAlertMessage.value = '¡Ejercicio creado correctamente!';
      showEjercicioAlert.value = true;
      setTimeout(() => {
        showEjercicioAlert.value = false;
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
    
    await apiFetch('/api/editExercici', {
      exerciciId: editandoEjercicio.value.ExerciciId,
      nom: formatearTexto(ejercicioEditado.value.nombre),
      grupsMusculars: ejercicioEditado.value.gruposMusculares.filter(gm => gm !== null)
    });

    cancelarEdicionEjercicio();
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

function alertWindow(message:string){
  alertMessage.value = message
  showAlert.value = true;

  setTimeout(() => {
        showAlert.value = false;
      }, 5000);
}

</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>Mis ejercicios</h1>

      <div class="page-header-actions">
      <button @click="volverAEntrenos" class="btn btn-secondary">
        &larr; Volver
      </button>
      <button @click="toggleForm" class="btn btn-primary">
        {{ showForm ? 'Cancelar' : 'Nuevo Ejercicio' }}
      </button>
      </div>
    </header>

    <div v-if="showEjercicioAlert" class="toast toast-success">
      {{ ejercicioAlertMessage }}
    </div>

    <div v-if="showAlert" class="toast toast-warning">
      {{ alertMessage }}
    </div>
 
 
    
    <!-- Filtro por grupo muscular -->
    <div class="panel">
      <h3>Filtrar por grupo muscular</h3>
      <div class="filtro-grupos">
        <button 
          class="chip-filter" 
          :class="{ 'active': filtroGrupoMuscular === null }"
          @click="limpiarFiltro"
        >
          Todos
        </button>
        <button 
          v-for="grupo in gruposMusculares" 
          :key="grupo.GrupMuscularId"
          class="chip-filter"
          :class="{ 'active': filtroGrupoMuscular === grupo.GrupMuscularId }"
          @click="filtroGrupoMuscular = grupo.GrupMuscularId"
        >
          {{ grupo.Nom }}
        </button>
      </div>
    </div>
    
    <!-- Formulario para añadir nuevo ejercicio -->
    <div v-if="showForm" class="card card-elevated">
      <h2>Nuevo Ejercicio</h2>
      <form @submit.prevent="newExercici" class="ejercicio-form">
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
    
    <div v-if="isLoading" class="state-box">
      <p>Cargando ejercicios...</p>
    </div>
    
    <div v-else-if="error" class="state-box error">
      <p>{{ error }}</p>
      <button @click="loadEjercicios" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="ejercicios.length === 0" class="state-box">
      <p class="no-ejercicios-text">No tienes ejercicios registrados.</p>
      <button @click="toggleForm" class="btn btn-primary btn-lg">Crear tu primer ejercicio</button>
    </div>
    
    <div v-else>
      <h2 class="section-title">Lista de ejercicios</h2>
      
      <div class="search-row">
        <input type="text" v-model="busquedaNombre" class="form-control" placeholder="🔍 Buscar por nombre..." />
        <button v-if="busquedaNombre" @click="busquedaNombre = ''" class="btn btn-secondary btn-sm">×</button>
      </div>
      
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
          class="list-card"
          
          
        >
          <!-- Modo visualización -->
          <div v-if="editandoEjercicio?.ExerciciId !== ejercicio.ExerciciId" class="list-card-body" @click="verDetalleEjercicio(ejercicio.ExerciciId)">
            <h3  >{{ ejercicio.Nom }}</h3>
            <p v-if="ejercicio.PR > 0" class="list-card-meta">
              PR: <strong>{{ ejercicio.PR }} kg</strong>
            </p>
            <div class="grupos-musculares">
              <span v-if="ejercicio.GrupMuscular1" class="chip">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular1) }}
              </span>
              <span v-if="ejercicio.GrupMuscular2" class="chip">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular2) }}
              </span>
              <span v-if="ejercicio.GrupMuscular3" class="chip">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular3) }}
              </span>
              <span v-if="ejercicio.GrupMuscular4" class="chip">
                {{ getNombreGrupoMuscular(ejercicio.GrupMuscular4) }}
              </span>
              <span v-if="ejercicio.GrupMuscular5" class="chip">
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
.list-card-body h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
}

.grupos-musculares {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.ejercicio-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.resultados-filtro {
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.edit-mode {
  width: 100%;
}

.list-card:has(.edit-mode) {
  flex-direction: column;
  align-items: stretch;
  cursor: default;
}

.list-card:has(.edit-mode) .ejercicio-actions {
  align-self: flex-end;
  margin-top: 0.75rem;
}

.list-card-body:not(.edit-mode) {
  cursor: pointer;
}

.edit-mode .grupos-seleccion {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.filtro-grupos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.search-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.search-row .form-control {
  flex: 1;
}
</style>
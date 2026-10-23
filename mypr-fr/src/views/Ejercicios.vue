<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Plus, Search, X } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { formatearTexto, guardarNuevoEjercicio } from '../utils/ejercicioUtils';
import { apiFetch } from '../services/api';
import BottomSheet from '../components/BottomSheet.vue';
import FilaEjercicio from '../components/listas/FilaEjercicio.vue';
import GrupoChips from '../components/listas/GrupoChips.vue';

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
const ejercicioAlertMessage = ref('');
const router = useRouter();
const route = useRoute();
const ejercicios = ref<Ejercicio[]>([]);
const gruposMusculares = ref<GrupoMuscular[]>([]);
const isLoading = ref(true);
const guardando = ref(false);
const error = ref('');
const formError = ref('');
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

const gruposDe = (e: Ejercicio): (number | null)[] =>
  [e.GrupMuscular1, e.GrupMuscular2, e.GrupMuscular3, e.GrupMuscular4, e.GrupMuscular5];

// Ejercicios filtrados por grupo muscular
const ejerciciosFiltrados = computed(() => {
  let resultado = ejercicios.value;

  if (filtroGrupoMuscular.value !== null) {
    resultado = resultado.filter(ejercicio => gruposDe(ejercicio).includes(filtroGrupoMuscular.value));
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
    error.value = '';

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

// Resetear el formulario
const resetForm = () => {
  nuevoEjercicio.value = {
    nombre: '',
    gruposMusculares: []
  };
  formError.value = '';
};

// Abrir/cerrar la hoja de nuevo ejercicio
const abrirForm = () => {
  resetForm();
  showForm.value = true;
};
const cerrarForm = () => {
  showForm.value = false;
  resetForm();
};

function capitalize(s: string) {
  return s.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
}

const newExercici = async () => {
  const newName = capitalize(nuevoEjercicio.value.nombre);
  const duplicated = ejercicios.value.some(value => value.Nom === newName);
  if (duplicated) {
    formError.value = 'Este nombre de ejercicio ya existe';
    return;
  }
  guardarEjercicio();
};

// Función para guardar el nuevo ejercicio
const guardarEjercicio = async () => {
  guardando.value = true;
  formError.value = '';

  await guardarNuevoEjercicio(
    {
      Nom: nuevoEjercicio.value.nombre,
      gruposMusculares: nuevoEjercicio.value.gruposMusculares.filter((gm): gm is number => gm !== null)
    },
    async () => {
      // Recargar la lista de ejercicios
      await loadEjercicios();

      // Resetear el formulario y ocultar
      cerrarForm();

      // Mostrar mensaje de éxito
      ejercicioAlertMessage.value = '¡Ejercicio creado correctamente!';
      showEjercicioAlert.value = true;
      setTimeout(() => {
        showEjercicioAlert.value = false;
      }, 3000);
    },
    (errorMessage) => {
      formError.value = errorMessage;
    }
  );

  guardando.value = false;
};

// Obtener el nombre del grupo muscular
const getNombreGrupoMuscular = (id: number | null): string => {
  if (!id) return '';
  const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === id);
  return grupo ? grupo.Nom : `ID: ${id}`;
};

const nombresGrupos = (e: Ejercicio): string[] =>
  gruposDe(e).filter((g): g is number => !!g).map(getNombreGrupoMuscular);

// Iniciar edición de ejercicio
const iniciarEdicionEjercicio = (ejercicio: Ejercicio) => {
  editandoEjercicio.value = ejercicio;
  formError.value = '';

  // Preparar el estado de edición
  ejercicioEditado.value.nombre = ejercicio.Nom;
  ejercicioEditado.value.gruposMusculares = gruposDe(ejercicio).filter((g): g is number => !!g);
};

// Cancelar edición de ejercicio
const cancelarEdicionEjercicio = () => {
  editandoEjercicio.value = null;
  formError.value = '';
  ejercicioEditado.value = {
    nombre: '',
    gruposMusculares: []
  };
};

// Guardar edición de ejercicio
const guardarEdicionEjercicio = async () => {
  if (!editandoEjercicio.value) return;

  if (!ejercicioEditado.value.nombre.trim()) {
    formError.value = 'Por favor, introduce un nombre para el ejercicio';
    return;
  }

  if (ejercicioEditado.value.gruposMusculares.length === 0) {
    formError.value = 'Por favor, selecciona al menos un grupo muscular';
    return;
  }

  try {
    guardando.value = true;

    await apiFetch('/api/editExercici', {
      exerciciId: editandoEjercicio.value.ExerciciId,
      nom: formatearTexto(ejercicioEditado.value.nombre),
      grupsMusculars: ejercicioEditado.value.gruposMusculares.filter(gm => gm !== null)
    });

    cancelarEdicionEjercicio();
    await loadEjercicios();
  } catch (err: any) {
    formError.value = err.message || 'Error al editar el ejercicio';
    console.error('Error al editar ejercicio:', err);
  } finally {
    guardando.value = false;
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
  <div class="page ejercicios">
    <header class="marcador">
      <h1>Mis ejercicios</h1>
      <button type="button" @click="abrirForm" class="btn btn-primary btn-sm">
        <Plus :size="18" aria-hidden="true" /> Nuevo ejercicio
      </button>
    </header>

    <div v-if="showEjercicioAlert" class="toast toast-success" role="status">
      {{ ejercicioAlertMessage }}
    </div>

    <!-- Barra pegajosa: búsqueda + filtro por grupo muscular -->
    <div class="barra">
      <div class="busqueda">
        <Search :size="18" class="busqueda-ico" aria-hidden="true" />
        <input type="search" v-model="busquedaNombre" class="busqueda-input" placeholder="Buscar ejercicio" aria-label="Buscar ejercicio por nombre" />
        <button v-if="busquedaNombre" type="button" class="busqueda-x" aria-label="Borrar búsqueda" @click="busquedaNombre = ''"><X :size="18" /></button>
      </div>
      <div class="filtro-grupos" role="group" aria-label="Filtrar por grupo muscular">
        <button
          type="button"
          class="filtro"
          :class="{ active: filtroGrupoMuscular === null }"
          :aria-pressed="filtroGrupoMuscular === null"
          @click="limpiarFiltro"
        >Todos</button>
        <button
          v-for="grupo in gruposMusculares"
          :key="grupo.GrupMuscularId"
          type="button"
          class="filtro"
          :class="{ active: filtroGrupoMuscular === grupo.GrupMuscularId }"
          :aria-pressed="filtroGrupoMuscular === grupo.GrupMuscularId"
          @click="filtroGrupoMuscular = grupo.GrupMuscularId"
        >{{ grupo.Nom }}</button>
      </div>
    </div>

    <div v-if="isLoading" class="cargando" role="status" aria-live="polite">
      <div class="sk" v-for="n in 5" :key="n"></div>
      <span class="sr-only">Cargando ejercicios...</span>
    </div>

    <div v-else-if="error" class="state-box error" role="alert">
      <p>{{ error }}</p>
      <button @click="loadEjercicios" class="btn">Reintentar</button>
    </div>

    <div v-else-if="ejercicios.length === 0" class="state-box">
      <p>No tienes ejercicios registrados.</p>
      <button @click="abrirForm" class="btn btn-primary btn-lg">Crear tu primer ejercicio</button>
    </div>

    <div v-else>
      <h2 class="section-title" aria-live="polite">
        {{ ejerciciosFiltrados.length }} {{ ejerciciosFiltrados.length === 1 ? 'ejercicio' : 'ejercicios' }}
        <template v-if="filtroGrupoMuscular !== null"> · {{ getNombreGrupoMuscular(filtroGrupoMuscular) }}</template>
      </h2>

      <p v-if="ejerciciosFiltrados.length === 0" class="sin-resultados">Ningún ejercicio coincide con la búsqueda.</p>

      <FilaEjercicio
        v-for="ejercicio in ejerciciosFiltrados"
        :key="ejercicio.ExerciciId"
        :nombre="ejercicio.Nom"
        :pr="ejercicio.PR"
        :grupos="nombresGrupos(ejercicio)"
        @abrir="verDetalleEjercicio(ejercicio.ExerciciId)"
        @editar="iniciarEdicionEjercicio(ejercicio)"
      />
    </div>

    <!-- Nuevo ejercicio -->
    <BottomSheet :open="showForm" title="Nuevo ejercicio" @close="cerrarForm">
      <form @submit.prevent="newExercici" class="hoja-form">
        <div class="form-group">
          <label for="nombre">Nombre</label>
          <input type="text" id="nombre" v-model="nuevoEjercicio.nombre" class="form-control" required placeholder="Ej: Press de banca" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Grupos musculares</label>
          <GrupoChips v-model="nuevoEjercicio.gruposMusculares" :grupos="gruposMusculares" />
        </div>
        <div v-if="formError" class="error-message" role="alert">{{ formError }}</div>
        <div class="form-actions">
          <button type="button" @click="cerrarForm" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar ejercicio' }}</button>
        </div>
      </form>
    </BottomSheet>

    <!-- Editar ejercicio -->
    <BottomSheet :open="editandoEjercicio !== null" title="Editar ejercicio" @close="cancelarEdicionEjercicio">
      <form @submit.prevent="guardarEdicionEjercicio" class="hoja-form">
        <div class="form-group">
          <label for="edit-nombre">Nombre</label>
          <input type="text" id="edit-nombre" v-model="ejercicioEditado.nombre" class="form-control" required placeholder="Nombre del ejercicio" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Grupos musculares</label>
          <GrupoChips v-model="ejercicioEditado.gruposMusculares" :grupos="gruposMusculares" />
        </div>
        <div v-if="formError" class="error-message" role="alert">{{ formError }}</div>
        <div class="form-actions">
          <button type="button" @click="cancelarEdicionEjercicio" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="guardando">{{ guardando ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </BottomSheet>
  </div>
</template>

<style scoped>
.marcador {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.marcador h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 7vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
}

.barra {
  position: sticky;
  top: 0;
  z-index: 20;
  margin: 0 calc(-1 * var(--space-page-x)) 1rem;
  padding: 0.5rem var(--space-page-x) 0.6rem;
  background: var(--n0);
  border-bottom: 1px solid var(--n3);
}

.busqueda { position: relative; display: flex; align-items: center; margin-bottom: 0.6rem; }
.busqueda-ico { position: absolute; left: 0.8rem; color: var(--n6); pointer-events: none; }
.busqueda-input {
  width: 100%;
  min-height: var(--touch-min);
  padding: 0 2.9rem 0 2.5rem;
  background: var(--n1);
  border: 1px solid var(--n4);
  border-radius: var(--radius-md);
  color: var(--n8);
  font-family: var(--font-sans);
  font-size: 1rem;
  box-sizing: border-box;
}
.busqueda-input::placeholder { color: var(--n6); }
.busqueda-input:focus-visible { outline: 2px solid var(--led-amber); outline-offset: 1px; }
.busqueda-x {
  position: absolute;
  right: 0;
  width: var(--touch-min);
  height: var(--touch-min);
  display: grid;
  place-items: center;
  background: none;
  border: none;
  color: var(--n7);
  cursor: pointer;
}
.busqueda-x:focus-visible { outline: 2px solid var(--judge-white); outline-offset: -4px; }

/* Una sola fila desplazable */
.filtro-grupos {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 calc(-1 * var(--space-page-x));
  padding: 0 var(--space-page-x);
}
.filtro-grupos::-webkit-scrollbar { display: none; }
.filtro {
  flex-shrink: 0;
  min-height: var(--touch-min);
  padding: 0 0.9rem;
  background: var(--n1);
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  color: var(--n7);
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.filtro:hover:not(.active) { background: var(--n2); color: var(--n8); }
.filtro.active { background: var(--led-amber); border-color: var(--led-amber); color: var(--on-amber); }
.filtro:focus-visible { outline: 2px solid var(--judge-white); outline-offset: 2px; }

.sk {
  height: 4rem;
  margin-bottom: 0.5rem;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  animation: pulso 1.4s ease-in-out infinite;
}
@keyframes pulso { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

.sin-resultados { color: var(--n6); text-align: center; padding: 1.5rem 0; margin: 0; }
.hoja-form .form-actions { margin-top: 1.25rem; }
</style>

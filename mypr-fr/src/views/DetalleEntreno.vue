<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {useAuthStore} from   '../stores/auth';  
import { guardarNuevoEjercicio } from '../utils/ejercicioUtils';
import Chatbot from '../components/Chatbot.vue';
import BuscadorSelect from '../components/BuscadorSelect.vue';
// Importamos el nuevo componente hijo
import SerieItem from '../components/SerieItem.vue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const authStore = useAuthStore();

// Interfaces (Se pueden mover a un archivo types.ts para limpiar más)
interface Entreno {
  EntrenoId: number;
  UserId: number;
  Data: number;
  CargaTotal: number;
  Nom: string;
  Descripcio: string | null;
  Puntuacio: number | null;
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
  // ... otros campos opcionales si no se usan
}

interface GrupoMuscular {
  GrupMuscularId: number;
  Nom: string;
}

const route = useRoute();
const router = useRouter();
const entrenoId = Number(route.params.id);

// Estados
const entreno = ref<Entreno | null>(null);
const series = ref<Serie[]>([]);
const ejercicios = ref<Ejercicio[]>([]);
const gruposMusculares = ref<GrupoMuscular[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const error = ref('');
const showForm = ref(false);

// Alertas
const showPrAlert = ref(false);
const prMessage = ref('');
const showEjercicioModal = ref(false);
const showEjercicioAlert = ref(false);
const showAlert = ref(false);
const alertMessage = ref('');
const ejercicioAlertMessage = ref('');

// Formularios
const nuevoEjercicio = ref({ Nom: '', gruposMusculares: [] as number[] });
const guardandoEjercicio = ref(false);
const errorGuardado = ref('');
let lastExercise = ref(0);

const nuevaSerie = ref({ ejercicioId: 0, kg: 0, reps: 0 });
const editandoEntreno = ref(false);
const entrenoEditado = ref({ nom: '', descripcio: '', puntuacio: 3 });

// Computed
const cargaCalculada = computed(() => nuevaSerie.value.kg * nuevaSerie.value.reps);
const ejerciciosUnicos = computed(() => new Set(series.value.map(serie => serie.ExerciciId)).size);

const ejercicioGrupoMap = computed(() => {
  const map = new Map();
  if (ejercicios.value.length === 0 || gruposMusculares.value.length === 0) return map;
  ejercicios.value.forEach(ejercicio => {
    if (ejercicio.GrupMuscular1) {
      const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === ejercicio.GrupMuscular1);
      if (grupo) map.set(ejercicio.ExerciciId, grupo.Nom);
    }
  });
  return map;
});

// Funciones auxiliares
const formatDateTitle = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const alertWindow = (msg: string) => { alertMessage.value = msg; showAlert.value = true; setTimeout(() => showAlert.value = false, 5000); };
const capitalize = (s: string) => s.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

// Cargas de datos
const loadEntreno = async () => {
  if (!authStore.isAuthenticated) return router.push('/login');
  try {
    isLoading.value = true;
    const token = authStore.token;
    const res = await fetch(API_URL+'/api/getEntreno', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, entrenoId })
    });
    if (!res.ok) throw new Error('Error al cargar entreno');
    
    const data = await res.json();
    entreno.value = data.entreno[0];
    if (entreno.value) entreno.value.CargaTotal = parseFloat((entreno.value.CargaTotal / 1000).toFixed(2));
    series.value = data.series;
    
    await loadEjercicios();
    if (gruposMusculares.value.length === 0) await loadGruposMusculares();
  } catch (err: any) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

const loadEjercicios = async () => {
  try {
    const token = authStore.token;
    const res = await fetch(API_URL+'/api/getExercicis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    if (!res.ok) throw new Error('Error ejercicios');
    ejercicios.value = await res.json();
    
    // Recuperar último ejercicio
    const lastSaved = localStorage.getItem('lastSelectedExerciseId');
    if (lastSaved && ejercicios.value.some(e => e.ExerciciId === Number(lastSaved))) {
      nuevaSerie.value.ejercicioId = Number(lastSaved);
    } else if (ejercicios.value.length > 0) {
      nuevaSerie.value.ejercicioId = ejercicios.value[0].ExerciciId;
    }
    lastExercise.value = nuevaSerie.value.ejercicioId;
  } catch (e) { console.error(e); }
};

const loadGruposMusculares = async () => {
  try {
    const token = authStore.token;
    const res = await fetch(API_URL+'/api/getGrupsMusculars', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    if (!res.ok) throw new Error('Error grupos');
    const data = await res.json();
    gruposMusculares.value = Array.isArray(data) ? data : data.results || [];
  } catch (e) { console.error(e); }
};

watch(() => nuevaSerie.value.ejercicioId, (newId) => {
  if (newId) {
    localStorage.setItem('lastSelectedExerciseId', newId.toString());
    lastExercise.value = newId;
  }
});

// Acciones Principales
const guardarSerie = async () => {
  if (nuevaSerie.value.ejercicioId === 0 || nuevaSerie.value.kg <= 0 || nuevaSerie.value.reps <= 0) {
    return alertWindow('Completa todos los campos correctamente (mínimo 0.5kg)');
  }
  
  try {
    isSaving.value = true;
    const token = authStore.token;
    const res = await fetch(API_URL+'/api/novaSerie', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, entrenoId, exerciciId: nuevaSerie.value.ejercicioId, kg: nuevaSerie.value.kg, reps: nuevaSerie.value.reps })
    });
    
    if (!res.ok) throw new Error('Error al guardar');
    const data = await res.json();
    
    if (data.newPr) {
      const ej = ejercicios.value.find(e => e.ExerciciId === nuevaSerie.value.ejercicioId);
      prMessage.value = `¡Felicidades! Nuevo PR en ${ej?.Nom} con ${nuevaSerie.value.kg}kg`;
      showPrAlert.value = true;
      setTimeout(() => showPrAlert.value = false, 5000);
    }

    // Actualización local optimista
    if (entreno.value) {
      entreno.value.CargaTotal = parseFloat((data.cargaTotal / 1000).toFixed(2));
      const nuevaSerieLocal: Serie = {
        SerieId: data.serieId, UserId: entreno.value.UserId, EntrenoId: entreno.value.EntrenoId,
        ExerciciId: nuevaSerie.value.ejercicioId, Kg: nuevaSerie.value.kg, Reps: nuevaSerie.value.reps,
        Carga: nuevaSerie.value.kg * nuevaSerie.value.reps, PR: data.newPr, Data: Math.floor(Date.now() / 1000)
      };
      series.value.push(nuevaSerieLocal);
    }

    // Resetear formulario (manteniendo ejercicio)
    const currentId = nuevaSerie.value.ejercicioId;
    nuevaSerie.value = { ejercicioId: currentId, kg: 0, reps: 0 };
    showForm.value = false;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    isSaving.value = false;
  }
};

// Handlers para eventos del hijo (SerieItem)
const onSerieUpdated = (payload: any) => {
  // Actualización local sin recargar toda la página
  const { data, serieId, entrenoId, exerciciId, kg, reps } = payload;

  // Actualizar totales del entreno (servidor devuelve en kg)
  if (entreno.value && data?.cargaTotal !== undefined) {
    entreno.value.CargaTotal = parseFloat((data.cargaTotal / 1000).toFixed(2));
  }

  // Encontrar serie y actualizar campos
  const idx = series.value.findIndex(s => s.SerieId === serieId);
  if (idx !== -1) {
    const oldExerciciId = series.value[idx].ExerciciId;
    series.value[idx].ExerciciId = exerciciId;
    series.value[idx].Kg = kg;
    series.value[idx].Reps = reps;
    series.value[idx].Carga = kg * reps;

    // Recalcular PR para el ejercicio anterior si cambió
    const affectedExercises = new Set<number>([oldExerciciId, exerciciId]);
    affectedExercises.forEach((exId) => {
      const group = series.value.filter(s => s.ExerciciId === exId);
      if (group.length > 0) {
        const maxKg = Math.max(...group.map(s => s.Kg));
        group.forEach(s => { s.PR = s.Kg === maxKg; });
      }
    });
  }

  // Alerta PR si corresponde
  if (data?.newPr) {
    const ej = ejercicios.value.find(e => e.ExerciciId === exerciciId);
    prMessage.value = `¡Felicidades! Nuevo PR en ${ej?.Nom} con ${kg}kg`;
    showPrAlert.value = true;
    setTimeout(() => showPrAlert.value = false, 5000);
  }
};

const onSerieDeleted = (payload: any) => {
  // Eliminar localmente y actualizar totales/PRs sin recargar
  const { data, serieId, exerciciId, carga } = payload;
  alertWindow('¡Serie eliminada!');

  // Actualizar total del entreno (usar valor del servidor si está, si no, restar localmente)
  if (entreno.value) {
    if (data?.cargaTotal !== undefined) {
      entreno.value.CargaTotal = parseFloat((data.cargaTotal / 1000).toFixed(2));
    } else if (typeof carga === 'number') {
      const nuevaCargaKg = Math.max(0, (entreno.value.CargaTotal * 1000) - carga);
      entreno.value.CargaTotal = parseFloat((nuevaCargaKg / 1000).toFixed(2));
    }
  }

  // Quitar serie
  const idx = series.value.findIndex(s => s.SerieId === serieId);
  if (idx !== -1) {
    series.value.splice(idx, 1);
  }

  // Recalcular PR del ejercicio afectado
  const group = series.value.filter(s => s.ExerciciId === exerciciId);
  if (group.length > 0) {
    const maxKg = Math.max(...group.map(s => s.Kg));
    group.forEach(s => { s.PR = s.Kg === maxKg; });
  }
};

// Entreno Header lógica
const iniciarEdicionEntreno = () => {
  if (entreno.value) {
    entrenoEditado.value = { nom: entreno.value.Nom || '', descripcio: entreno.value.Descripcio || '', puntuacio: entreno.value.Puntuacio || 3 };
    editandoEntreno.value = true;
  }
};

const guardarCambiosEntreno = async () => {
  if (!entreno.value) return;
  try {
    const token = authStore.token;
    const res = await fetch(API_URL + '/api/editEntreno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        entrenoId: entreno.value.EntrenoId,
        nom: entrenoEditado.value.nom,
        descripcio: entrenoEditado.value.descripcio,
        puntuacio: entrenoEditado.value.puntuacio
      })
    });
    if (!res.ok) throw new Error('Error update');
    const data = await res.json();

    // Actualización local sin recargar
    const updated = data?.entreno;
    if (updated && entreno.value) {
      entreno.value.Nom = updated.Nom ?? entrenoEditado.value.nom;
      entreno.value.Descripcio = updated.Descripcio ?? entrenoEditado.value.descripcio ?? '';
      entreno.value.Puntuacio = updated.Puntuacio ?? entrenoEditado.value.puntuacio ?? null;
      // Nota: mantenemos CargaTotal tal como está (ya formateada en Tn)
    }

    editandoEntreno.value = false;
  } catch (e: any) {
    error.value = e.message;
  }
};

// Lógica Modal Ejercicio
const newExercici = async () => {
  const newName = capitalize(nuevoEjercicio.value.Nom);
  if (ejercicios.value.some(v => v.Nom == newName)) return alertWindow('Nombre duplicado');
  guardandoEjercicio.value = true;
  errorGuardado.value = '';
  
  await guardarNuevoEjercicio(nuevoEjercicio.value, async (id) => {
    await loadEjercicios();
    lastExercise.value = id;
    nuevaSerie.value.ejercicioId = id;
    localStorage.setItem('lastSelectedExerciseId', id.toString());
    showEjercicioModal.value = false;
    ejercicioAlertMessage.value = '¡Ejercicio creado!';
    showEjercicioAlert.value = true;
    setTimeout(() => showEjercicioAlert.value = false, 3000);
  }, (err) => errorGuardado.value = err);
  guardandoEjercicio.value = false;
};

const abrirModalEjercicio = () => {
  nuevoEjercicio.value = { Nom: '', gruposMusculares: [] };
  showEjercicioModal.value = true;
  if (gruposMusculares.value.length === 0) loadGruposMusculares();
};

onMounted(loadEntreno);

// Drag-and-drop reordenado
const dragSerieId = ref<number | null>(null);
const onDragStart = (id: number) => { dragSerieId.value = id; };
const onDrop = async (targetId: number) => {
  if (dragSerieId.value === null) return;
  const fromIdx = series.value.findIndex(s => s.SerieId === dragSerieId.value);
  const toIdx = series.value.findIndex(s => s.SerieId === targetId);
  dragSerieId.value = null;
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

  const prevOrder = [...series.value];
  const [moved] = series.value.splice(fromIdx, 1);
  series.value.splice(toIdx, 0, moved);

  try {
    const token = authStore.token;
    const res = await fetch(API_URL + '/api/reorderSerie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, entrenoId, serieId: moved.SerieId, newIndex: toIdx })
    });
    if (!res.ok) throw new Error('Error al reordenar');
    await res.json();
  } catch (e) {
    series.value = prevOrder;
    alertWindow('No se pudo reordenar. Inténtalo de nuevo.');
  }
};
</script>

<template>
  <div class="detalle-entreno-container">
    <header class="header">
      <h1 v-if="entreno" class="entreno-title">{{ formatDateTitle(entreno.Data) }}</h1>
      <button @click="router.push('/entrenos')" class="btn btn-secondary">&larr; Volver</button>
    </header>
    
    <div v-if="showPrAlert" class="pr-alert">{{ prMessage }}</div>
    <div v-if="showEjercicioAlert" class="ejercicio-alert">{{ ejercicioAlertMessage }}</div>
    <div v-if="showAlert" class="alert">{{ alertMessage }}</div>
    
    <div v-if="isLoading" class="loading"><p>Cargando...</p></div>
    <div v-else-if="error" class="error"><p>{{ error }}</p><button @click="loadEntreno" class="btn">Reintentar</button></div>
    
    <div v-else-if="entreno" class="entreno-details">
      <!-- INFO HEADER COMPONENT (Inline por simplicidad, pero extraíble) -->
      <div class="entreno-info-card">
        <div v-if="!editandoEntreno" class="entreno-header">
          <div class="info-row"><span class="label">Nombre:</span><span class="value">{{ entreno.Nom || 'Sin nombre' }}</span></div>
          <div class="info-row"><span class="label">Descripción:</span><span class="value">{{ entreno.Descripcio || '-' }}</span></div>
          <div class="info-row"><span class="label">Puntuación:</span>
            <span class="value"><span v-for="i in 5" :key="i" class="star" :class="{ filled: entreno.Puntuacio && i <= entreno.Puntuacio }">★</span></span>
          </div>
          <button @click="iniciarEdicionEntreno" class="btn btn-secondary">Editar info</button>
        </div>
        <div v-else class="entreno-edit-form">
          <!-- Formulario edición entreno -->
          <div class="form-group"><label>Nombre:</label><input type="text" v-model="entrenoEditado.nom" class="form-control"></div>
          <div class="form-group"><label>Descripción:</label><textarea v-model="entrenoEditado.descripcio" class="form-control"></textarea></div>
          <div class="form-group">
            <label>Puntuación:</label>
            <div class="rating-input"><button v-for="i in 5" :key="i" class="star-btn btn" :class="{ filled: i <= entrenoEditado.puntuacio }" @click="entrenoEditado.puntuacio = i">★</button></div>
          </div>
          <div class="form-actions">
            <button @click="editandoEntreno = false" class="btn btn-secondary">Cancelar</button>
            <button @click="guardarCambiosEntreno" class="btn btn-primary">Guardar</button>
          </div>
        </div>
        <div class="info-row"><span class="label">Peso total:</span><span class="value">{{ entreno.CargaTotal }} Tn</span></div>
        <div class="info-row"><span class="label">Series:</span><span class="value">{{ series.length }}</span></div>
        <div class="info-row"><span class="label">Ejercicios:</span><span class="value">{{ ejerciciosUnicos }}</span></div>
      </div>
      
      <h2>Series</h2>
      
      <div v-if="!showForm" class="add-serie">
        <button @click="showForm = !showForm" class="btn btn-primary btn-lg">Agregar nueva serie</button>
      </div>
      
      <!-- Formulario Nueva Serie -->
      <div v-if="showForm" class="serie-card new-serie-card">
        <div class="serie-info">
          <h3>Añadir nueva serie</h3>
          <form @submit.prevent="guardarSerie" class="serie-form">
            <div class="form-group">
              <label>Ejercicio:</label>
              <div class="input-with-button">
                <BuscadorSelect v-model="nuevaSerie.ejercicioId" :options="ejercicios" label="Nom" :reduce="(e: any) => e.ExerciciId" placeholder="Busca un ejercicio..." />
                <button type="button" class="btn btn-primary btn-sm ejercicio-btn" @click="abrirModalEjercicio">+</button>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Peso (kg):</label><input type="number" v-model.number="nuevaSerie.kg" class="form-control" min="0" step="0.5"></div>
              <div class="form-group"><label>Reps:</label><input type="number" v-model.number="nuevaSerie.reps" class="form-control" min="1" step="1"></div>
            </div>
            <div class="form-group" v-if="nuevaSerie.kg > 0"><div class="carga-calculada"><span class="label">Total:</span><span class="value">{{ cargaCalculada }} kg</span></div></div>
            <div class="form-actions nueva-serie-actions">
              <button type="button" @click="showForm = false" class="btn btn-secondary">Cancelar</button>
              <button type="button" @click="guardarSerie" class="btn btn-primary" :disabled="isSaving">{{ isSaving ? '...' : 'Guardar' }}</button>
            </div>
          </form>
        </div>
      </div>
      
      <div v-if="series.length === 0 && !showForm" class="no-series"><p>No hay series registradas.</p></div>
      
      <!-- LISTA DE SERIES COMPONENTIZADA -->
      <div v-else class="series-list">
        <SerieItem 
          v-for="serie in series" 
          :key="serie.SerieId"
          :serie="serie"
          :ejercicios="ejercicios"
          :grupo-muscular-nombre="ejercicioGrupoMap.get(serie.ExerciciId)"
          @serieUpdated="onSerieUpdated"
          @serieDeleted="onSerieDeleted"
          @openModalEjercicio="abrirModalEjercicio"
          @goToEjercicio="(id) => router.push(`/ejercicio/${id}`)"
          @dragStart="onDragStart"
          @drop="onDrop"
        />
      </div>
    </div>
  </div>
  
  <!-- Modal Ejercicio -->
  <div v-if="showEjercicioModal" class="modal-overlay" @click="showEjercicioModal = false">
    <div class="modal-container" @click.stop>
      <div class="modal-header"><h3>Nuevo ejercicio</h3><button class="btn-close" @click="showEjercicioModal = false">&times;</button></div>
      <div class="modal-body">
        <form @submit.prevent="newExercici" class="ejercicio-form">
          <div class="form-group"><label>Nombre:</label><input type="text" v-model="nuevoEjercicio.Nom" class="form-control" required></div>
          <div class="form-group">
            <label>Grupos:</label>
            <div class="grupos-seleccion">
              <div v-for="grupo in gruposMusculares" :key="grupo.GrupMuscularId" class="grupo-checkbox">
                <input type="checkbox" :id="'grp'+grupo.GrupMuscularId" :value="grupo.GrupMuscularId" v-model="nuevoEjercicio.gruposMusculares">
                <label :for="'grp'+grupo.GrupMuscularId">{{ grupo.Nom }}</label>
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" @click="showEjercicioModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="guardandoEjercicio">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
  
  <!-- Chatbot conectado con @refresh para actualizar datos si la AI hace cambios -->
  <Chatbot 
    :entreno-id="entrenoId" 
    :entreno-data="entreno" 
    :series="series" 
    :ejercicios="ejercicios"
    @refresh="loadEntreno"
  />
</template>

<!-- Importamos el CSS externo -->
<style src="../styles/detalle-entreno.css"></style>

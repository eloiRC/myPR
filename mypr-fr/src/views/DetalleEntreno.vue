<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
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
  GrupMuscular2: number | null;
  GrupMuscular3: number | null;
  GrupMuscular4: number | null;
  GrupMuscular5: number | null;
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
const showResumen = ref(false);
const showDatos = ref(false);
const modoGrafico = ref<'series' | 'reps'>('series');
const editandoNombre = ref(false);
const nombreEditado = ref('');
const nombreInput = ref<HTMLInputElement | null>(null);
const modoVisualizacion = ref<'lista' | 'tarjetas'>('lista');
const serieActualIdx = ref(0);
const touchStartX = ref(0);
const touchStartY = ref(0);
const editandoCard = ref(false);
const cardEditData = ref({ ejercicioId: 0, kg: 0, reps: 0 });
const completadasMap = ref<Record<number, boolean>>({});

// Triple tap en tarjetas
const tapCount = ref(0);
const lastTapTime = ref<number>(0);
const TAP_WINDOW_MS = 800;
const onCardTap = (serieId: number) => {
  if (editandoCard.value) return;
  const now = Date.now();
  if (now - lastTapTime.value > TAP_WINDOW_MS) {
    tapCount.value = 0;
  }
  tapCount.value += 1;
  lastTapTime.value = now;
  if (tapCount.value >= 3) {
    toggleCompletadoCard(serieId);
    tapCount.value = 0;
    if (navigator.vibrate) navigator.vibrate(50);
  }
};

// Computed
const cargaCalculada = computed(() => nuevaSerie.value.kg * nuevaSerie.value.reps);
const ejerciciosUnicos = computed(() => new Set(series.value.map(serie => serie.ExerciciId)).size);

// Mostrar las series con la más reciente arriba (invertido respecto al orden base)
const seriesDisplay = computed(() => series.value.slice().reverse());
const seriesCardOrder = computed(() => seriesDisplay.value);

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

const musculoStats = computed(() => {
  const stats = new Map<string, { series: number; reps: number }>();
  if (!ejercicios.value.length || !series.value.length) return [];

  series.value.forEach(s => {
    const ej = ejercicios.value.find(e => e.ExerciciId === s.ExerciciId);
    if (!ej) return;
    const gmIds = [ej.GrupMuscular1, ej.GrupMuscular2, ej.GrupMuscular3, ej.GrupMuscular4, ej.GrupMuscular5].filter(Boolean) as number[];
    if (!gmIds.length) return;
    gmIds.forEach(gmId => {
      const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === gmId);
      if (!grupo) return;
      if (!stats.has(grupo.Nom)) stats.set(grupo.Nom, { series: 0, reps: 0 });
      const st = stats.get(grupo.Nom)!;
      st.series++;
      st.reps += s.Reps;
    });
  });

  const maxSeries = Math.max(...Array.from(stats.values()).map(v => v.series), 1);
  const maxReps = Math.max(...Array.from(stats.values()).map(v => v.reps), 1);

  return Array.from(stats.entries()).map(([nom, v]) => ({
    nom,
    series: v.series,
    reps: v.reps,
    pctSeries: Math.round((v.series / maxSeries) * 100),
    pctReps: Math.round((v.reps / maxReps) * 100),
  })).sort((a, b) => b[modoGrafico.value === 'series' ? 'pctSeries' : 'pctReps'] - a[modoGrafico.value === 'series' ? 'pctSeries' : 'pctReps']);
});

// Card view helpers
const serieActual = computed(() => seriesCardOrder.value[serieActualIdx.value] || null);

const nombreEjercicio = (serie: any) => {
  return ejercicios.value.find(e => e.ExerciciId === serie.ExerciciId)?.Nom || 'Ejercicio desconocido';
};

const grupoMuscularNombre = (serie: any) => {
  const ej = ejercicios.value.find(e => e.ExerciciId === serie.ExerciciId);
  if (!ej || !ej.GrupMuscular1) return '';
  const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === ej.GrupMuscular1);
  return grupo?.Nom || '';
};

const isCompletada = (serieId: number) => completadasMap.value[serieId] ?? false;

const cargarCompletadas = () => {
  const map: Record<number, boolean> = {};
  seriesCardOrder.value.forEach(s => {
    map[s.SerieId] = localStorage.getItem(`serie_completed_${s.SerieId}`) === 'true';
  });
  completadasMap.value = map;
};

const toggleCompletadoCard = (serieId: number) => {
  const key = `serie_completed_${serieId}`;
  const nowCompleted = !completadasMap.value[serieId];
  completadasMap.value = { ...completadasMap.value, [serieId]: nowCompleted };
  if (nowCompleted) {
    localStorage.setItem(key, 'true');
  } else {
    localStorage.removeItem(key);
  }
};

const avanzaSerie = () => {
  if (serieActualIdx.value < seriesCardOrder.value.length - 1) {
    serieActualIdx.value++;
    editandoCard.value = false;
  }
};

const retrocedeSerie = () => {
  if (serieActualIdx.value > 0) {
    serieActualIdx.value--;
    editandoCard.value = false;
  }
};

const primerIdxNoCompletado = () => {
  for (let i = 0; i < seriesCardOrder.value.length; i++) {
    if (!isCompletada(seriesCardOrder.value[i].SerieId)) return i;
  }
  return 0;
};

const cambiarModoTarjetas = () => {
  modoVisualizacion.value = 'tarjetas';
  cargarCompletadas();
  serieActualIdx.value = primerIdxNoCompletado();
  editandoCard.value = false;
};

const iniciarEdicionCard = () => {
  if (!serieActual.value) return;
  cardEditData.value = {
    ejercicioId: serieActual.value.ExerciciId,
    kg: serieActual.value.Kg,
    reps: serieActual.value.Reps
  };
  editandoCard.value = true;
};

const cancelarEdicionCard = () => {
  editandoCard.value = false;
};

const guardarEdicionCard = async () => {
  if (!serieActual.value || !entreno.value) return;
  try {
    const token = authStore.token;
    const res = await fetch(API_URL + '/api/editSerie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        serieId: serieActual.value.SerieId,
        entrenoId: entreno.value.EntrenoId,
        exerciciId: cardEditData.value.ejercicioId,
        kg: cardEditData.value.kg,
        reps: cardEditData.value.reps
      })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    onSerieUpdated({ data, serieId: serieActual.value.SerieId, entrenoId: entreno.value.EntrenoId, exerciciId: cardEditData.value.ejercicioId, kg: cardEditData.value.kg, reps: cardEditData.value.reps });
    editandoCard.value = false;
  } catch {
    alertWindow('Error al guardar');
  }
};

const eliminarCard = async () => {
  if (!serieActual.value) return;
  if (!confirm('¿Eliminar esta serie?')) return;
  try {
    const token = authStore.token;
    const res = await fetch(API_URL + '/api/deleteSerie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, serieId: serieActual.value.SerieId })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    localStorage.removeItem(`serie_completed_${serieActual.value.SerieId}`);
    const deletedId = serieActual.value.SerieId;
    onSerieDeleted({ data, serieId: deletedId, entrenoId: serieActual.value.EntrenoId, exerciciId: serieActual.value.ExerciciId, carga: serieActual.value.Carga });
    completadasMap.value = { ...completadasMap.value };
    delete completadasMap.value[deletedId];
    if (serieActualIdx.value >= seriesCardOrder.value.length - 1 && serieActualIdx.value > 0) {
      serieActualIdx.value--;
    }
  } catch {
    alertWindow('Error al eliminar');
  }
};

const onTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
};

const onTouchEnd = (e: TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchStartX.value;
  const dy = e.changedTouches[0].clientY - touchStartY.value;
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
  if (dx > 0) retrocedeSerie();
  else avanzaSerie();
};

const onKeyDown = (e: KeyboardEvent) => {
  if (modoVisualizacion.value !== 'tarjetas') return;
  if (e.key === 'ArrowLeft') { retrocedeSerie(); e.preventDefault(); }
  if (e.key === 'ArrowRight') { avanzaSerie(); e.preventDefault(); }
};

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
  const { data, serieId, exerciciId, kg, reps } = payload;

  // Actualizar totales del entreno (servidor devuelve en kg)
  if (entreno.value && data?.cargaTotal !== undefined) {
    entreno.value.CargaTotal = parseFloat((data.cargaTotal / 1000).toFixed(2));
  }

  // Encontrar serie y actualizar campos
  const idx = series.value.findIndex(s => s.SerieId === serieId);
  if (idx !== -1) {

    series.value[idx].ExerciciId = exerciciId;
    series.value[idx].Kg = kg;
    series.value[idx].Reps = reps;
    series.value[idx].Carga = kg * reps;

    // Actualizar PR de la serie específica si el servidor devuelve nueva información
    if (data && typeof data.newPr !== 'undefined') {
      series.value[idx].PR = !!data.newPr;
    }
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
  const { data, serieId, carga } = payload;
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

// Nombre inline editable
const iniciarEdicionNombre = () => {
  if (entreno.value) {
    nombreEditado.value = entreno.value.Nom || '';
    editandoNombre.value = true;
    nextTick(() => nombreInput.value?.focus());
  }
};

const guardarNombre = async () => {
  if (!entreno.value || !editandoNombre.value) return;
  editandoNombre.value = false;
  const nuevoNom = nombreEditado.value.trim() || 'Sin nombre';
  if (nuevoNom === entreno.value.Nom) return;
  try {
    const token = authStore.token;
    const res = await fetch(API_URL + '/api/editEntreno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        entrenoId: entreno.value.EntrenoId,
        nom: nuevoNom,
        descripcio: entreno.value.Descripcio || '',
        puntuacio: entreno.value.Puntuacio || 3
      })
    });
    if (!res.ok) throw new Error();
    entreno.value.Nom = nuevoNom;
  } catch {
    alertWindow('Error al guardar el nombre');
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

onMounted(() => {
  loadEntreno();
  window.addEventListener('keydown', onKeyDown);
});
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));

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
  <div class="page detalle-entreno">
    <header class="page-header">
      <h1 v-if="entreno" class="entreno-title">
        <span v-if="!editandoNombre" class="editable-name" @click="iniciarEdicionNombre" title="Haz clic para editar">{{ entreno.Nom || 'Sin nombre' }}</span>
        <input v-else ref="nombreInput" v-model="nombreEditado" @blur="guardarNombre" @keyup.enter="guardarNombre" @keyup.escape="editandoNombre = false" class="nombre-input-inline" />
      </h1>
      <button @click="router.push('/entrenos')" class="btn btn-secondary">&larr; Volver</button>
    </header>
    
    <div v-if="showPrAlert" class="toast toast-success">{{ prMessage }}</div>
    <div v-if="showEjercicioAlert" class="toast toast-success">{{ ejercicioAlertMessage }}</div>
    <div v-if="showAlert" class="toast toast-warning">{{ alertMessage }}</div>
    
    <div v-if="isLoading" class="state-box"><p>Cargando...</p></div>
    <div v-else-if="error" class="state-box error"><p>{{ error }}</p><button @click="loadEntreno" class="btn">Reintentar</button></div>
    
    <div v-else-if="entreno" class="entreno-details">
      <!-- PANEL RESUMEN (colapsable, cerrado por defecto) -->
      <div class="collapsible-panel">
        <div class="collapsible-header" @click="showResumen = !showResumen">
          <span>Resumen del entreno</span>
          <span class="chevron" :class="{ open: showResumen }">▶</span>
        </div>
        <div class="collapsible-body" :class="{ open: showResumen }">
          <div class="info-row"><span class="label">Peso total:</span><span class="value">{{ entreno.CargaTotal }} Tn</span></div>
          <div class="info-row"><span class="label">Series:</span><span class="value">{{ series.length }}</span></div>
          <div class="info-row"><span class="label">Ejercicios:</span><span class="value">{{ ejerciciosUnicos }}</span></div>
          <div v-if="musculoStats.length" class="musculo-graph">
            <div class="graph-toggle">
              <button class="toggle-btn" :class="{ active: modoGrafico === 'series' }" @click="modoGrafico = 'series'">Series</button>
              <button class="toggle-btn" :class="{ active: modoGrafico === 'reps' }" @click="modoGrafico = 'reps'">Reps</button>
            </div>
            <div class="graph-bars">
              <div v-for="m in musculoStats" :key="m.nom" class="graph-row">
                <span class="graph-label">{{ m.nom }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (modoGrafico === 'series' ? m.pctSeries : m.pctReps) + '%' }"></div>
                </div>
                <span class="graph-value">{{ modoGrafico === 'series' ? m.series : m.reps }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DATOS DEL ENTRENO (colapsable, cerrado por defecto) -->
      <div class="collapsible-panel">
        <div class="collapsible-header" @click="showDatos = !showDatos">
          <span>Datos del entreno</span>
          <span class="chevron" :class="{ open: showDatos }">▶</span>
        </div>
        <div class="collapsible-body" :class="{ open: showDatos }">
          <div v-if="!editandoEntreno">
            <div class="info-row"><span class="label">Fecha:</span><span class="value">{{ formatDateTitle(entreno.Data) }}</span></div>
            <div class="info-row"><span class="label">Nombre:</span><span class="value">{{ entreno.Nom || 'Sin nombre' }}</span></div>
            <div class="info-row"><span class="label">Descripción:</span><span class="value">{{ entreno.Descripcio || '-' }}</span></div>
            <div class="info-row"><span class="label">Puntuación:</span>
              <span class="value"><span v-for="i in 5" :key="i" class="star" :class="{ filled: entreno.Puntuacio && i <= entreno.Puntuacio }">★</span></span>
            </div>
            <button @click="iniciarEdicionEntreno" class="btn btn-secondary" style="width:100%;margin-top:0.5rem;">Editar info</button>
          </div>
          <div v-else class="entreno-edit-form">
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
        </div>
      </div>
      
      <h2 class="section-title">Series</h2>
      
      <div v-if="!showForm" class="add-serie">
        <button @click="showForm = !showForm" class="btn btn-primary btn-lg">Agregar nueva serie</button>
      </div>

      <!-- Toggle vista Lista / Tarjetas -->
      <div v-if="series.length > 0" class="view-toggle">
        <button class="toggle-btn" :class="{ active: modoVisualizacion === 'lista' }" @click="modoVisualizacion = 'lista'">Lista</button>
        <button class="toggle-btn" :class="{ active: modoVisualizacion === 'tarjetas' }" @click="cambiarModoTarjetas">Tarjetas</button>
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
      
      <div v-if="series.length === 0 && !showForm" class="state-box"><p>No hay series registradas.</p></div>
      
      <!-- MODO LISTA -->
      <div v-else-if="modoVisualizacion === 'lista'" class="series-list">
        <SerieItem 
          v-for="serie in seriesDisplay" 
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
      
      <!-- MODO TARJETAS (Tinder swipe) -->
      <div v-else-if="serieActual" class="swipe-area" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <div v-if="!editandoCard" class="serie-card-big" :class="{ 'serie-done': isCompletada(serieActual.SerieId) }" @click="onCardTap(serieActual.SerieId)">
          <div class="big-ejercicio">{{ nombreEjercicio(serieActual) }}</div>
          <div class="big-stats">
            <span class="big-kg">{{ serieActual.Kg }} kg</span>
            <span class="big-x">×</span>
            <span class="big-reps">{{ serieActual.Reps }}</span>
          </div>
          <div class="big-carga">{{ serieActual.Carga }} kg total</div>
          <div v-if="serieActual.PR" class="pr-badge">PR 🏆</div>
          <div v-if="grupoMuscularNombre(serieActual)" class="big-grupo">{{ grupoMuscularNombre(serieActual) }}</div>
          <div class="big-actions">
            <button class="btn btn-secondary btn-sm" @click.stop="iniciarEdicionCard">Editar</button>
            <button class="btn btn-danger btn-sm" @click.stop="eliminarCard">Eliminar</button>
          </div>
        </div>
        <div v-else class="serie-card-big editing-card">
          <div class="card-edit-form">
            <h3>Editar serie</h3>
            <div class="form-group">
              <label>Ejercicio:</label>
              <div class="input-with-button">
                <BuscadorSelect v-model="cardEditData.ejercicioId" :options="ejercicios" label="Nom" :reduce="(e: any) => e.ExerciciId" />
                <button type="button" class="btn btn-secondary btn-sm" @click.stop="abrirModalEjercicio">+</button>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Peso:</label><input type="number" v-model.number="cardEditData.kg" class="form-control" step="0.5"></div>
              <div class="form-group"><label>Reps:</label><input type="number" v-model.number="cardEditData.reps" class="form-control"></div>
            </div>
            <div class="form-actions">
              <button class="btn btn-secondary" @click="cancelarEdicionCard">Cancelar</button>
              <button class="btn btn-primary" @click="guardarEdicionCard">Guardar</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="modoVisualizacion === 'tarjetas'" class="state-box"><p>No hay series registradas.</p></div>
      
      <!-- Dots de progreso (solo en modo tarjetas) -->
      <div v-if="modoVisualizacion === 'tarjetas' && seriesCardOrder.length > 0" class="card-dots">
        <span v-for="(s, i) in seriesCardOrder" :key="s.SerieId" 
          class="dot" 
          :class="{ active: i === serieActualIdx, done: isCompletada(s.SerieId) }"
          @click="serieActualIdx = i"></span>
        <span class="dot-count">{{ serieActualIdx + 1 }} / {{ seriesCardOrder.length }}</span>
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

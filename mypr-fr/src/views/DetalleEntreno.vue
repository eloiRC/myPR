<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Flag } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { guardarNuevoEjercicio } from '../utils/ejercicioUtils';
import { apiFetch } from '../services/api';
import { leerVista, guardarVista, resolverIndiceTarjeta, abiertoPersistido } from '../utils/vistaEntreno';
import {
  agruparPorEjercicio, siguientePendiente, resumenSesion, inicioSesion, formatoSesion, elegirEntrenoActual, MAX_SESION_SEG,
} from '../utils/entreno';
import Chatbot from '../components/Chatbot.vue';
import BottomSheet from '../components/BottomSheet.vue';
import SerieForm from '../components/SerieForm.vue';
import SerieItem from '../components/SerieItem.vue';
import RestTimer from '../components/RestTimer.vue';
import MarcadorSesion from '../components/entreno/MarcadorSesion.vue';
import ModoTarjetas from '../components/entreno/ModoTarjetas.vue';
import PrToast from '../components/entreno/PrToast.vue';
import ResumenSesion from '../components/entreno/ResumenSesion.vue';
import DatosEntreno from '../components/entreno/DatosEntreno.vue';
import NuevoEjercicioSheet from '../components/entreno/NuevoEjercicioSheet.vue';
import { eliminarConDeshacer } from '../composables/useDeshacer';
import { useRestTimer } from '../composables/useRestTimer';

const authStore = useAuthStore();

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
  Completada?: number;
  /** Descanso propio de la serie (s); null = el del ejercicio */
  DescansoSeg?: number | null;
  Data: number;
}

interface Ejercicio {
  ExerciciId: number;
  Nom: string;
  UserId: number;
  PR: number;
  /** Descanso por defecto del ejercicio (s) */
  DescansoSeg?: number | null;
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

type ValoresSerie = { ejercicioId: number; kg: number; reps: number; descansoSeg: number | null };

const route = useRoute();
const router = useRouter();
// Reactivo: /entreno/123 → /entreno/456 reutiliza este componente y debe recargar
const entrenoId = ref(0);

// Estados
const entreno = ref<Entreno | null>(null);
const series = ref<Serie[]>([]);
const ejercicios = ref<Ejercicio[]>([]);
const gruposMusculares = ref<GrupoMuscular[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const error = ref('');

// Hojas inferiores
const showForm = ref(false);
const showDatos = ref(false);
const showTerminar = ref(false);
const showEjercicioModal = ref(false);
// Edición de una serie (la serie se conserva al cerrar para que el contenido no desaparezca durante la animación)
const editOpen = ref(false);
const editSerie = ref<Serie | null>(null);
const editGuardando = ref(false);
const editError = ref('');

// Avisos
const pr = ref({ open: false, ejercicio: '', kg: 0, reps: 0 });
let prTimer: ReturnType<typeof setTimeout> | null = null;
const avisoOk = ref('');
const avisoError = ref('');
let avisoOkTimer: ReturnType<typeof setTimeout> | null = null;
let avisoErrorTimer: ReturnType<typeof setTimeout> | null = null;

// Formularios
const guardandoEjercicio = ref(false);
const errorGuardado = ref('');
const nuevaSerie = ref({ ejercicioId: 0, kg: 0, reps: 0 });
const nuevaSerieError = ref('');

// Modo de vista y tarjetas
const modoVisualizacion = ref<'lista' | 'tarjetas'>('tarjetas');
const serieActualIdx = ref(0);
// Posición recordada: SerieId de la última tarjeta vista (solo se actualiza en modo tarjetas)
const serieIdVista = ref<number | null>(null);
const vistaRestaurada = ref(false);
const completadasMap = ref<Record<number, boolean>>({});

// Tiempo de sesión: desde la primera serie del entreno (si es de hoy) o, si no hay datos, desde que se abrió
const abiertoSeg = ref(Math.floor(Date.now() / 1000));
const ahoraSeg = ref(abiertoSeg.value);
let relojTimer: ReturnType<typeof setInterval> | null = null;

const restTimer = useRestTimer();

// ---------- Datos derivados ----------
const isCompletada = (serieId: number) => completadasMap.value[serieId] ?? false;

// Última serie del ejercicio seleccionado en este entreno: sirve de referencia y para prerrellenar
const ultimaSerieEjercicio = computed(() => {
  for (let i = series.value.length - 1; i >= 0; i--) {
    if (series.value[i].ExerciciId === nuevaSerie.value.ejercicioId) return series.value[i];
  }
  return null;
});

const gruposDeEjercicio = (ej: Ejercicio | undefined): string[] => {
  if (!ej) return [];
  return [ej.GrupMuscular1, ej.GrupMuscular2, ej.GrupMuscular3, ej.GrupMuscular4, ej.GrupMuscular5]
    .filter((id): id is number => id !== null && id !== undefined)
    .map(id => gruposMusculares.value.find(g => g.GrupMuscularId === id)?.Nom)
    .filter((nom): nom is string => !!nom);
};
const gruposMuscularesDeSerie = (serie: { ExerciciId: number }): string[] =>
  gruposDeEjercicio(ejercicios.value.find(e => e.ExerciciId === serie.ExerciciId));
const gruposDeId = (id: number): string[] => gruposDeEjercicio(ejercicios.value.find(e => e.ExerciciId === id));
const nombreEjercicioId = (id: number) => ejercicios.value.find(e => e.ExerciciId === id)?.Nom || 'Ejercicio desconocido';
const nombreEjercicio = (serie: { ExerciciId: number }) => nombreEjercicioId(serie.ExerciciId);

const grupos = computed(() => agruparPorEjercicio(series.value, isCompletada));
const pendiente = computed(() => siguientePendiente(series.value, isCompletada));
const hechasCount = computed(() => series.value.filter(s => isCompletada(s.SerieId)).length);
const celdasMarcador = computed(() =>
  series.value.map(s => (isCompletada(s.SerieId) ? 'hecha' : s.SerieId === pendiente.value?.SerieId ? 'actual' : 'pendiente') as 'hecha' | 'actual' | 'pendiente'));

// Tira superior: huecos entre tramos y etiqueta (nombre del ejercicio) por serie
const cortesMarcador = computed(() => grupos.value.slice(1).map(g => g.filas[0].idx));
const etiquetasMarcador = computed(() => series.value.map(s => nombreEjercicio(s)));

const duracionSeg = computed(() => Math.max(0, ahoraSeg.value - inicioSesion(series.value, abiertoSeg.value, ahoraSeg.value)));
const tiempoSesion = computed(() => formatoSesion(duracionSeg.value));
const resumen = computed(() => resumenSesion(series.value, isCompletada, duracionSeg.value));

// Orden cronológico de la API (el mismo que usa el reordenado)
const seriesCardOrder = computed(() => series.value.slice());
const serieActual = computed(() => seriesCardOrder.value[serieActualIdx.value] || null);

// ---------- Avisos ----------
const PR_TOAST_MS = 6000;
const celebrarPr = (exerciciId: number, kg: number, reps: number) => {
  pr.value = { open: true, ejercicio: nombreEjercicioId(exerciciId), kg, reps };
  if (navigator.vibrate) navigator.vibrate([80, 60, 160]);
  if (prTimer) clearTimeout(prTimer);
  prTimer = setTimeout(() => { pr.value.open = false; }, PR_TOAST_MS);
};
const alertWindow = (msg: string) => {
  avisoError.value = msg;
  if (avisoErrorTimer) clearTimeout(avisoErrorTimer);
  avisoErrorTimer = setTimeout(() => { avisoError.value = ''; }, 5000);
};
const avisoExito = (msg: string) => {
  avisoOk.value = msg;
  if (avisoOkTimer) clearTimeout(avisoOkTimer);
  avisoOkTimer = setTimeout(() => { avisoOk.value = ''; }, 3000);
};

// ---------- Completadas ----------
const cargarCompletadas = () => {
  const map: Record<number, boolean> = {};
  series.value.forEach(s => { map[s.SerieId] = (s as any).Completada === 1; });
  completadasMap.value = map;
};

const toggleCompletadoCard = async (serieId: number) => {
  const currentState = completadasMap.value[serieId] ?? false;
  const newState = !currentState;
  // Mantenemos serie.Completada al día para que reconstruir el mapa no pierda cambios
  const setLocal = (state: boolean) => {
    completadasMap.value = { ...completadasMap.value, [serieId]: state };
    const serie = series.value.find(s => s.SerieId === serieId) as any;
    if (serie) serie.Completada = state ? 1 : 0;
  };
  setLocal(newState);
  if (newState) {
    // Temporizador de descanso (solo al marcar, no al desmarcar): serie > ejercicio > global
    const serieHecha = series.value.find(s => s.SerieId === serieId);
    const ejercicioHecho = serieHecha ? ejercicios.value.find(e => e.ExerciciId === serieHecha.ExerciciId) : undefined;
    restTimer.iniciarAuto(serieHecha, ejercicioHecho);
  }
  try {
    await apiFetch('/api/toggleSerieCompletada', { serieId, completada: newState });
  } catch {
    setLocal(currentState);
    alertWindow('Error al guardar el estado de la serie');
  }
};



// ---------- Modo tarjetas ----------
const primerIdxNoCompletado = () => {
  for (let i = 0; i < seriesCardOrder.value.length; i++) {
    if (!isCompletada(seriesCardOrder.value[i].SerieId)) return i;
  }
  return 0;
};

const cambiarModoTarjetas = () => {
  modoVisualizacion.value = 'tarjetas';
  // Si hay una posición guardada de este entreno la respetamos; si no, la primera serie sin completar
  const guardada = leerVista(entrenoId.value);
  serieActualIdx.value = resolverIndiceTarjeta(guardada?.serieId, seriesCardOrder.value, primerIdxNoCompletado);
};

// Restaura modo y tarjeta al cargar (una sola vez, cuando ya hay series)
const restaurarVista = () => {
  if (vistaRestaurada.value) return;
  vistaRestaurada.value = true;
  const guardada = leerVista(entrenoId.value);
  if (!guardada) {
    // Sin vista guardada: tarjetas, en la primera serie sin hacer
    if (seriesCardOrder.value.length > 0) serieActualIdx.value = primerIdxNoCompletado();
    return;
  }
  serieIdVista.value = guardada.serieId;
  if (guardada.modo === 'tarjetas' && seriesCardOrder.value.length > 0) {
    modoVisualizacion.value = 'tarjetas';
    serieActualIdx.value = resolverIndiceTarjeta(guardada.serieId, seriesCardOrder.value, primerIdxNoCompletado);
  }
};

// Persistimos cada cambio de modo o de tarjeta (solo tras restaurar, para no pisar lo guardado)
watch([modoVisualizacion, () => serieActual.value?.SerieId], () => {
  if (!vistaRestaurada.value) return;
  if (modoVisualizacion.value === 'tarjetas' && serieActual.value) serieIdVista.value = serieActual.value.SerieId;
  guardarVista(entrenoId.value, { modo: modoVisualizacion.value, serieId: serieIdVista.value });
});

// Si se borran series y el índice se sale del rango, volvemos a la última
watch(() => series.value.length, (n) => {
  if (serieActualIdx.value >= n) serieActualIdx.value = Math.max(0, n - 1);
});

// ---------- Cargas de datos ----------
const capitalize = (s: string) => s.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());

let cargaSeq = 0;
const loadEntreno = async () => {
  if (!authStore.isAuthenticated) return router.push('/login');
  const seq = ++cargaSeq;
  const id = entrenoId.value;
  try {
    isLoading.value = true;
    error.value = '';
    const data = await apiFetch<{ entreno: any[]; series: any[] }>('/api/getEntreno', { entrenoId: id });
    if (seq !== cargaSeq) return; // llegó tarde: ya se navegó a otro entreno
    entreno.value = data.entreno[0];
    if (entreno.value) entreno.value.CargaTotal = parseFloat((entreno.value.CargaTotal / 1000).toFixed(2));
    series.value = data.series;
    cargarCompletadas();
    restaurarVista();

    await loadEjercicios();
    if (gruposMusculares.value.length === 0) await loadGruposMusculares();
  } catch (err: any) {
    if (seq === cargaSeq) error.value = err.message;
  } finally {
    if (seq === cargaSeq) isLoading.value = false;
  }
};

const loadEjercicios = async () => {
  try {
    ejercicios.value = await apiFetch<any[]>('/api/getExercicis', {});

    const lastSaved = localStorage.getItem('lastSelectedExerciseId');
    if (lastSaved && ejercicios.value.some(e => e.ExerciciId === Number(lastSaved))) {
      nuevaSerie.value.ejercicioId = Number(lastSaved);
    } else if (ejercicios.value.length > 0) {
      nuevaSerie.value.ejercicioId = ejercicios.value[0].ExerciciId;
    }
  } catch (e) { console.error(e); }
};

const loadGruposMusculares = async () => {
  try {
    const data = await apiFetch<any[]>('/api/getGrupsMusculars', {});
    gruposMusculares.value = Array.isArray(data) ? data : [];
  } catch (e) { console.error(e); }
};

// /entreno/actual: el entreno de hoy (el último, si es de hoy) o uno nuevo
const resolverActual = async () => {
  const seq = ++cargaSeq;
  try {
    isLoading.value = true;
    error.value = '';
    const ahora = Math.floor(Date.now() / 1000);
    const lista = await apiFetch<any[]>('/api/getEntrenos', { dataInici: ahora - 30 * 24 * 3600, dataFi: ahora + 3600 });
    let id = elegirEntrenoActual(Array.isArray(lista) ? lista : [], ahora);
    if (id === null) {
      const nuevo = await apiFetch<{ entrenoId: number }>('/api/nouEntreno', {});
      id = nuevo.entrenoId;
    }
    if (seq !== cargaSeq) return;
    // Conserva la query (chat=1): el watcher de la ruta cargará el entreno
    await router.replace({ name: 'detalleEntreno', params: { id: String(id) }, query: { ...route.query } });
  } catch (err: any) {
    if (seq === cargaSeq) { error.value = err?.message || 'No se pudo abrir el entreno de hoy'; isLoading.value = false; }
  }
};

const resetearEstado = () => {
  entreno.value = null;
  series.value = [];
  completadasMap.value = {};
  modoVisualizacion.value = 'tarjetas';
  serieActualIdx.value = 0;
  serieIdVista.value = null;
  vistaRestaurada.value = false;
  error.value = '';
  showForm.value = false;
  showDatos.value = false;
  showTerminar.value = false;
  editOpen.value = false;
  pr.value.open = false;
};

const cargarRuta = async () => {
  if (!authStore.isAuthenticated) return router.push('/login');
  const p = route.params.id;
  resetearEstado();
  if (p === 'actual') return resolverActual();
  const id = Number(p);
  if (!Number.isInteger(id) || id <= 0) {
    error.value = 'Entreno no válido';
    isLoading.value = false;
    return;
  }
  entrenoId.value = id;
  // El reloj de sesión sobrevive a recargar: se recuerda cuándo se abrió el entreno
  ahoraSeg.value = Math.floor(Date.now() / 1000);
  abiertoSeg.value = abiertoPersistido(id, ahoraSeg.value, MAX_SESION_SEG);
  await loadEntreno();
};

watch(() => route.params.id, (nuevo, viejo) => {
  if (route.name !== 'detalleEntreno' || !nuevo || nuevo === viejo) return;
  cargarRuta();
});

watch(() => nuevaSerie.value.ejercicioId, (newId) => {
  if (newId) {
    try { localStorage.setItem('lastSelectedExerciseId', newId.toString()); } catch { /* sin almacenamiento */ }
    // Al cambiar de ejercicio con el formulario abierto, tomamos su última serie como base
    if (showForm.value) prefillDesdeUltimaSerie();
  }
});

// ---------- Nueva serie ----------
const prefillDesdeUltimaSerie = () => {
  const ultima = ultimaSerieEjercicio.value;
  if (ultima) {
    nuevaSerie.value.kg = ultima.Kg;
    nuevaSerie.value.reps = ultima.Reps;
  }
};

const abrirFormularioSerie = () => {
  // Si no hay valores, empezamos desde la última serie de ese ejercicio
  if (nuevaSerie.value.kg <= 0 || nuevaSerie.value.reps <= 0) prefillDesdeUltimaSerie();
  nuevaSerieError.value = '';
  showForm.value = true;
};

// El formulario avisa cuando el usuario elige otro ejercicio
const onEjercicioNuevaSerie = (id: number) => { nuevaSerie.value.ejercicioId = id; };

/** Crea una serie en el servidor y la añade localmente. Devuelve true si se guardó. */
const crearSerie = async (valores: ValoresSerie): Promise<boolean> => {
  nuevaSerieError.value = '';
  try {
    isSaving.value = true;
    const data = await apiFetch<any>('/api/novaSerie', {
      entrenoId: entrenoId.value, exerciciId: valores.ejercicioId, kg: valores.kg, reps: valores.reps, descansoSeg: valores.descansoSeg
    });

    if (data.newPr) celebrarPr(valores.ejercicioId, valores.kg, valores.reps);

    // Actualización local optimista
    if (entreno.value) {
      entreno.value.CargaTotal = parseFloat((data.cargaTotal / 1000).toFixed(2));
      const nuevaSerieLocal: Serie = {
        SerieId: data.serieId, UserId: entreno.value.UserId, EntrenoId: entreno.value.EntrenoId,
        ExerciciId: valores.ejercicioId, Kg: valores.kg, Reps: valores.reps,
        Carga: valores.kg * valores.reps, PR: data.newPr, DescansoSeg: valores.descansoSeg, Data: Math.floor(Date.now() / 1000)
      };
      series.value.push(nuevaSerieLocal);
      completadasMap.value = { ...completadasMap.value, [nuevaSerieLocal.SerieId]: false };
    }
    return true;
  } catch (e: any) {
    nuevaSerieError.value = e?.message || 'No se pudo guardar la serie. Inténtalo de nuevo.';
    return false;
  } finally {
    isSaving.value = false;
  }
};

const guardarSerie = async (valores: ValoresSerie) => {
  // Mantenemos ejercicio, peso y reps como valores de partida de la siguiente serie (el descanso no se arrastra)
  nuevaSerie.value = { ejercicioId: valores.ejercicioId, kg: valores.kg, reps: valores.reps };
  if (await crearSerie(valores)) showForm.value = false;
};

// ---------- Editar / borrar ----------
const abrirEdicion = (serie: Serie) => {
  editSerie.value = serie;
  editError.value = '';
  editOpen.value = true;
};

const cerrarEdicion = () => {
  if (showEjercicioModal.value) return; // la hoja de «nuevo ejercicio» está encima
  editOpen.value = false;
};

const cerrarFormulario = () => {
  if (showEjercicioModal.value) return;
  showForm.value = false;
};

const onSerieUpdated = (payload: any) => {
  // Actualización local sin recargar toda la página
  const { data, serieId, exerciciId, kg, reps, descansoSeg } = payload;

  // Actualizar totales del entreno (servidor devuelve en kg)
  if (entreno.value && data?.cargaTotal !== undefined) {
    entreno.value.CargaTotal = parseFloat((data.cargaTotal / 1000).toFixed(2));
  }

  const idx = series.value.findIndex(s => s.SerieId === serieId);
  if (idx !== -1) {
    series.value[idx].ExerciciId = exerciciId;
    series.value[idx].Kg = kg;
    series.value[idx].Reps = reps;
    series.value[idx].Carga = kg * reps;
    if (descansoSeg !== undefined) series.value[idx].DescansoSeg = descansoSeg;

    // Actualizar PR de la serie específica si el servidor devuelve nueva información
    if (data && typeof data.newPr !== 'undefined') {
      series.value[idx].PR = !!data.newPr;
    }
  }

  // Alerta PR si corresponde
  if (data?.newPr) celebrarPr(exerciciId, kg, reps);
};

const guardarEdicion = async (valores: ValoresSerie) => {
  const serie = editSerie.value;
  if (!serie || !entreno.value) return;
  editGuardando.value = true;
  editError.value = '';
  try {
    const data = await apiFetch<any>('/api/editSerie', {
      serieId: serie.SerieId,
      entrenoId: entreno.value.EntrenoId,
      exerciciId: valores.ejercicioId,
      kg: valores.kg,
      reps: valores.reps,
      descansoSeg: valores.descansoSeg
    });
    onSerieUpdated({ data, serieId: serie.SerieId, entrenoId: entreno.value.EntrenoId, exerciciId: valores.ejercicioId, kg: valores.kg, reps: valores.reps, descansoSeg: valores.descansoSeg });
    editOpen.value = false;
  } catch {
    editError.value = 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
  } finally {
    editGuardando.value = false;
  }
};

// Borra una serie con opción de deshacer: sale ya de la pantalla y el borrado real se confirma tras unos segundos
const eliminarSerie = (serie: Serie) => {
  const serieId = serie.SerieId;
  const idx = series.value.findIndex(s => s.SerieId === serieId);
  if (idx === -1) return;
  const ajustarTotal = (deltaKg: number) => {
    if (!entreno.value) return;
    entreno.value.CargaTotal = parseFloat(Math.max(0, entreno.value.CargaTotal + deltaKg / 1000).toFixed(2));
  };
  eliminarConDeshacer({
    mensaje: 'Serie eliminada',
    aplicar: () => {
      series.value.splice(idx, 1);
      ajustarTotal(-(serie.Carga || 0));
    },
    revertir: () => {
      if (series.value.some(s => s.SerieId === serieId)) return;
      series.value.splice(Math.min(idx, series.value.length), 0, serie);
      ajustarTotal((serie.Carga || 0));
    },
    confirmar: async () => {
      const data = await apiFetch<any>('/api/deleteSerie', { serieId });
      if (entreno.value && data?.cargaTotal !== undefined) {
        entreno.value.CargaTotal = parseFloat((data.cargaTotal / 1000).toFixed(2));
      }
    },
  });
};

const eliminarDesdeEdicion = () => {
  if (!editSerie.value) return;
  eliminarSerie(editSerie.value);
  editOpen.value = false;
};

// ---------- Datos y nombre del entreno ----------
const guardarDatos = async (valores: { descripcio: string; puntuacio: number }) => {
  if (!entreno.value) return;
  const data = await apiFetch<any>('/api/editEntreno', {
    entrenoId: entreno.value.EntrenoId,
    descripcio: valores.descripcio,
    puntuacio: valores.puntuacio
  });
  // Actualización local sin recargar (CargaTotal ya está formateada en t)
  const updated = data?.entreno;
  if (entreno.value) {
    entreno.value.Nom = updated?.Nom ?? entreno.value.Nom;
    entreno.value.Descripcio = updated?.Descripcio ?? valores.descripcio ?? '';
    entreno.value.Puntuacio = updated?.Puntuacio ?? valores.puntuacio ?? null;
  }
};

const guardarNombre = async (nombre: string) => {
  if (!entreno.value) return;
  const nuevoNom = nombre.trim() || 'Sin nombre';
  if (nuevoNom === entreno.value.Nom) return;
  try {
    await apiFetch('/api/editEntreno', {
      entrenoId: entreno.value.EntrenoId,
      nom: nuevoNom,
      descripcio: entreno.value.Descripcio || '',
      puntuacio: entreno.value.Puntuacio || 3
    });
    entreno.value.Nom = nuevoNom;
  } catch {
    alertWindow('Error al guardar el nombre');
  }
};

// ---------- Crear ejercicio ----------
const newExercici = async (valores: { Nom: string; gruposMusculares: number[] }) => {
  const newName = capitalize(valores.Nom);
  if (ejercicios.value.some(v => v.Nom == newName)) {
    errorGuardado.value = 'Ya existe un ejercicio con ese nombre';
    return;
  }
  guardandoEjercicio.value = true;
  errorGuardado.value = '';

  await guardarNuevoEjercicio(valores, async (id) => {
    await loadEjercicios();
    nuevaSerie.value.ejercicioId = id;
    try { localStorage.setItem('lastSelectedExerciseId', id.toString()); } catch { /* sin almacenamiento */ }
    showEjercicioModal.value = false;
    avisoExito('Ejercicio creado');
  }, (err) => { errorGuardado.value = err; });
  guardandoEjercicio.value = false;
};

const abrirModalEjercicio = () => {
  errorGuardado.value = '';
  showEjercicioModal.value = true;
  if (gruposMusculares.value.length === 0) loadGruposMusculares();
};

// ---------- Tira superior como navegación ----------
// En tarjetas el cursor es la tarjeta actual; en lista, la serie que queda justo bajo la banda.
const indiceScroll = ref(0);
const indiceCursor = computed(() => (modoVisualizacion.value === 'tarjetas' ? serieActualIdx.value : indiceScroll.value));
let bloqueoScroll = 0;
let rafScroll = 0;

const bordeBanda = () => document.querySelector('.marcador')?.getBoundingClientRect().bottom ?? 0;

const actualizarIndiceScroll = () => {
  rafScroll = 0;
  if (modoVisualizacion.value !== 'lista' || Date.now() < bloqueoScroll) return;
  const corte = bordeBanda() + 8;
  const filas = document.querySelectorAll<HTMLElement>('[data-serie-id]');
  let idx = Math.max(0, series.value.length - 1);
  for (const el of filas) {
    if (el.getBoundingClientRect().bottom > corte) {
      const i = series.value.findIndex(s => s.SerieId === Number(el.dataset.serieId));
      if (i >= 0) idx = i;
      break;
    }
  }
  indiceScroll.value = idx;
};
const alHacerScroll = () => { if (!rafScroll) rafScroll = requestAnimationFrame(actualizarIndiceScroll); };

const irASerie = (i: number) => {
  const s = series.value[i];
  if (!s) return;
  if (modoVisualizacion.value === 'tarjetas') { serieActualIdx.value = i; return; }
  indiceScroll.value = i;
  bloqueoScroll = Date.now() + 400;
  const fila = document.querySelector<HTMLElement>(`[data-serie-id="${s.SerieId}"]`);
  if (!fila) return;
  // La primera fila de un tramo lleva su cabecera (nombre del ejercicio): se apunta a ella
  const destino = grupos.value.some(g => g.filas[0].serie.SerieId === s.SerieId) ? (fila.closest('section') ?? fila) : fila;
  window.scrollTo({ top: Math.max(0, destino.getBoundingClientRect().top + window.scrollY - bordeBanda() - 8) });
};

watch([modoVisualizacion, () => series.value.length], () => nextTick(actualizarIndiceScroll));

// ---------- Cabecera ----------
const abrirCoach = () => { router.replace({ query: { ...route.query, chat: '1' } }); };
const volver = () => router.push('/entrenos');

const terminar = () => {
  showTerminar.value = false;
  router.push('/entrenos');
};

onMounted(() => {
  cargarRuta();
  relojTimer = setInterval(() => { ahoraSeg.value = Math.floor(Date.now() / 1000); }, 1000);
  window.addEventListener('scroll', alHacerScroll, { passive: true });
});
onUnmounted(() => {
  if (relojTimer) clearInterval(relojTimer);
  window.removeEventListener('scroll', alHacerScroll);
  if (rafScroll) cancelAnimationFrame(rafScroll);
  if (prTimer) clearTimeout(prTimer);
  if (avisoOkTimer) clearTimeout(avisoOkTimer);
  if (avisoErrorTimer) clearTimeout(avisoErrorTimer);
});

// ---------- Reordenado (arrastre con ratón o pulsación larga) ----------
const dragSerieId = ref<number | null>(null);
const onDragStart = (id: number | null) => { dragSerieId.value = id; };
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
    await apiFetch('/api/reorderSerie', { entrenoId: entrenoId.value, serieId: moved.SerieId, newIndex: toIdx });
  } catch (e) {
    series.value = prevOrder;
    alertWindow('No se pudo reordenar. Inténtalo de nuevo.');
  }
};

const irAEjercicio = (id: number) => router.push(`/ejercicio/${id}`);
</script>

<template>
  <div class="detalle-entreno">
    <!-- Avisos (la región viva del récord está dentro de PrToast) -->
    <PrToast :open="pr.open" :ejercicio="pr.ejercicio" :kg="pr.kg" :reps="pr.reps" />
    <div v-if="avisoOk" class="aviso aviso--ok" role="status">{{ avisoOk }}</div>
    <div v-if="avisoError" class="aviso aviso--alerta" role="alert">{{ avisoError }}</div>

    <div v-if="isLoading" class="estado"><p>Cargando…</p></div>
    <div v-else-if="error" class="estado estado--error">
      <p>{{ error }}</p>
      <button type="button" class="btn btn-secondary" @click="cargarRuta">Reintentar</button>
      <button type="button" class="btn btn-quiet" @click="volver">Volver a entrenos</button>
    </div>

    <template v-else-if="entreno">
      <MarcadorSesion
        :nombre="entreno.Nom"
        :hechas="hechasCount"
        :total="series.length"
        :celdas="celdasMarcador"
        :cortes="cortesMarcador"
        :etiquetas="etiquetasMarcador"
        :indice="indiceCursor"
        @ir="irASerie"
        @volver="volver"
        @renombrar="guardarNombre"
        @datos="showDatos = true"
        @coach="abrirCoach"
      >
        <template #descanso><RestTimer /></template>
      </MarcadorSesion>

      <!-- Barra de herramientas -->
      <div v-if="series.length > 0" class="herramientas">
        <div class="segmento" role="group" aria-label="Vista de las series">
          <button type="button" class="segmento-btn" :class="{ activo: modoVisualizacion === 'lista' }" :aria-pressed="modoVisualizacion === 'lista'" @click="modoVisualizacion = 'lista'">Lista</button>
          <button type="button" class="segmento-btn" :class="{ activo: modoVisualizacion === 'tarjetas' }" :aria-pressed="modoVisualizacion === 'tarjetas'" @click="cambiarModoTarjetas">Tarjetas</button>
        </div>
        <button v-if="hechasCount > 0" type="button" class="btn btn-secondary terminar" aria-label="Terminar entreno" @click="showTerminar = true"><Flag :size="18" :stroke-width="2.25" aria-hidden="true" />Terminar</button>
      </div>

      <!-- MODO LISTA: series agrupadas por ejercicio -->
      <div v-if="modoVisualizacion === 'lista' && series.length > 0" class="grupos">
        <section v-for="g in grupos" :key="g.filas[0].serie.SerieId" class="grupo" :aria-label="nombreEjercicioId(g.ejercicioId)">
          <header class="grupo-cab">
            <button type="button" class="grupo-nombre" @click="irAEjercicio(g.ejercicioId)">{{ nombreEjercicioId(g.ejercicioId) }}</button>
            <span class="grupo-cuenta" :aria-label="`${g.hechas} de ${g.filas.length} series hechas`">{{ g.hechas }}<span class="grupo-total">/{{ g.filas.length }}</span></span>
          </header>
          <ul v-if="gruposDeId(g.ejercicioId).length" class="chips" aria-label="Músculos">
            <li v-for="m in gruposDeId(g.ejercicioId)" :key="m" class="chip-m">{{ m }}</li>
          </ul>
          <div class="grupo-filas">
            <SerieItem
              v-for="f in g.filas"
              :key="f.serie.SerieId"
              :serie="f.serie"
              :n="f.n"
              :completada="isCompletada(f.serie.SerieId)"
              :actual="f.serie.SerieId === pendiente?.SerieId"
              @toggle="toggleCompletadoCard"
              @edit="abrirEdicion"
              @drag-start="onDragStart"
              @drop="onDrop"
            />
          </div>
        </section>
        <p class="pista-reordenar">Mantén pulsada una serie para moverla.</p>
      </div>

      <!-- MODO TARJETAS -->
      <ModoTarjetas
        v-else-if="modoVisualizacion === 'tarjetas' && series.length > 0"
        :series="seriesCardOrder"
        :indice="serieActualIdx"
        :hechas="completadasMap"
        :nombre-de="nombreEjercicio"
        :grupos-de="gruposMuscularesDeSerie"
        @update:indice="serieActualIdx = $event"
        @toggle="toggleCompletadoCard"
        @editar="abrirEdicion"
        @ir-ejercicio="irAEjercicio"
      />
      <div v-else-if="modoVisualizacion === 'tarjetas'" class="estado"><p>No hay series registradas.</p></div>

      <div v-if="series.length > 0" class="anadir">
        <button type="button" class="btn btn-secondary anadir-btn" @click="abrirFormularioSerie"><Plus :size="20" :stroke-width="2.5" aria-hidden="true" />Añadir serie</button>
      </div>
    </template>
  </div>

  <!-- Hojas inferiores -->
  <BottomSheet :open="showForm" title="Nueva serie" @close="cerrarFormulario">
    <SerieForm
      mode="crear"
      :ejercicio-id="nuevaSerie.ejercicioId"
      :kg="nuevaSerie.kg"
      :reps="nuevaSerie.reps"
      :ejercicios="ejercicios"
      :ultima-serie="ultimaSerieEjercicio"
      :saving="isSaving"
      :error="nuevaSerieError"
      @ejercicio-change="onEjercicioNuevaSerie"
      @submit="guardarSerie"
      @cancel="showForm = false"
      @open-modal-ejercicio="abrirModalEjercicio"
    />
  </BottomSheet>

  <BottomSheet :open="editOpen" title="Editar serie" @close="cerrarEdicion">
    <SerieForm
      v-if="editSerie"
      mode="editar"
      borrable
      :ejercicio-id="editSerie.ExerciciId"
      :kg="editSerie.Kg"
      :reps="editSerie.Reps"
      :descanso-seg="editSerie.DescansoSeg ?? null"
      :ejercicios="ejercicios"
      :saving="editGuardando"
      :error="editError"
      @submit="guardarEdicion"
      @cancel="editOpen = false"
      @delete="eliminarDesdeEdicion"
      @open-modal-ejercicio="abrirModalEjercicio"
    />
  </BottomSheet>

  <BottomSheet :open="showDatos" title="Datos del entreno" @close="showDatos = false">
    <DatosEntreno
      v-if="entreno"
      :entreno="entreno"
      :series="series"
      :ejercicios="ejercicios"
      :grupos-musculares="gruposMusculares"
      :tiempo="tiempoSesion"
      :guardar="guardarDatos"
    />
  </BottomSheet>

  <BottomSheet :open="showTerminar" title="Entreno terminado" @close="showTerminar = false">
    <ResumenSesion :resumen="resumen" />
    <template #footer>
      <button type="button" class="btn btn-primary cerrar-resumen" @click="terminar">Volver a entrenos</button>
    </template>
  </BottomSheet>

  <NuevoEjercicioSheet
    :open="showEjercicioModal"
    :grupos="gruposMusculares"
    :guardando="guardandoEjercicio"
    :error="errorGuardado"
    @close="showEjercicioModal = false"
    @guardar="newExercici"
  />


  <!-- El coach se abre con ?chat=1 (botón de la cabecera del entreno); se refresca si la IA cambia datos -->
  <Chatbot
    v-if="entreno"
    :entreno-id="entrenoId"
    :entreno-data="entreno"
    :series="series"
    :ejercicios="ejercicios"
    @refresh="loadEntreno"
  />
</template>

<style src="../styles/detalle-entreno.css"></style>

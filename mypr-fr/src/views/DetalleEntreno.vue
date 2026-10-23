<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { guardarNuevoEjercicio } from '../utils/ejercicioUtils';
import { apiFetch } from '../services/api';
import { leerVista, guardarVista, resolverIndiceTarjeta } from '../utils/vistaEntreno';
import Chatbot from '../components/Chatbot.vue';
import SerieForm from '../components/SerieForm.vue';
import SerieItem from '../components/SerieItem.vue';
import RestTimer from '../components/RestTimer.vue';
import { useRestTimer } from '../composables/useRestTimer';

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
  Completada?: number;
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
const lastExercise = ref(0);

const nuevaSerie = ref({ ejercicioId: 0, kg: 0, reps: 0 });
const editandoEntreno = ref(false);
const entrenoEditado = ref({ nom: '', descripcio: '', puntuacio: 3 });
const showResumen = ref(false);
const showDatos = ref(false);
const modoGrafico = ref<'series' | 'reps' | 'carga'>('series');
const direction = ref<'next' | 'prev'>('next');
const editandoNombre = ref(false);
const nombreEditado = ref('');
const nombreInput = ref<HTMLInputElement | null>(null);
const modoVisualizacion = ref<'lista' | 'tarjetas'>('lista');
const serieActualIdx = ref(0);
const touchStartX = ref(0);
const touchStartY = ref(0);
const touchMoved = ref(false);
const touchStartTime = ref(0);
const editandoCard = ref(false);
const cardEditData = ref({ ejercicioId: 0, kg: 0, reps: 0 });
const cardGuardando = ref(false);
const cardError = ref('');
const nuevaSerieError = ref('');
// Series de la lista con el formulario de edición abierto (para ocultar el chatbot)
const editandoEnLista = ref<number[]>([]);
const hayFormularioAbierto = computed(() => showForm.value || editandoCard.value || editandoEnLista.value.length > 0);
const onEditingChange = (serieId: number, editando: boolean) => {
  const sin = editandoEnLista.value.filter(id => id !== serieId);
  editandoEnLista.value = editando ? [...sin, serieId] : sin;
};
// Posición recordada: SerieId de la última tarjeta vista (solo se actualiza en modo tarjetas)
const serieIdVista = ref<number | null>(null);
const vistaRestaurada = ref(false);
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
// Última serie del ejercicio seleccionado en este entreno: sirve de referencia y para prerrellenar
const ultimaSerieEjercicio = computed(() => {
  for (let i = series.value.length - 1; i >= 0; i--) {
    if (series.value[i].ExerciciId === nuevaSerie.value.ejercicioId) return series.value[i];
  }
  return null;
});

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

const PR_TOAST_MS = 6000;
const celebrarPr = (exerciciId: number, kg: number, reps: number) => {
  const ej = ejercicios.value.find(e => e.ExerciciId === exerciciId);
  prMessage.value = `${ej?.Nom ?? 'Ejercicio'} · ${kg} kg × ${reps}`;
  showPrAlert.value = true;
  if (navigator.vibrate) navigator.vibrate([80, 60, 160]);
  setTimeout(() => showPrAlert.value = false, PR_TOAST_MS);
};
const ejerciciosUnicos = computed(() => new Set(series.value.map(serie => serie.ExerciciId)).size);

// Mostrar las series con la más reciente arriba (invertido respecto al orden base)
const seriesDisplay = computed(() => series.value.slice().reverse());
// En modo carrusel usamos el orden cronológico (más antiguo primero) — orden inverso a la lista
const seriesCardOrder = computed(() => series.value.slice());

const ejercicioGrupoMap = computed(() => {
  const map = new Map<number, string[]>();
  if (ejercicios.value.length === 0 || gruposMusculares.value.length === 0) return map;
  ejercicios.value.forEach(ejercicio => {
    const ids = [ejercicio.GrupMuscular1, ejercicio.GrupMuscular2, ejercicio.GrupMuscular3, ejercicio.GrupMuscular4, ejercicio.GrupMuscular5]
      .filter((id): id is number => id !== null && id !== undefined);
    const noms = ids
      .map(id => gruposMusculares.value.find(g => g.GrupMuscularId === id)?.Nom)
      .filter((nom): nom is string => !!nom);
    if (noms.length) map.set(ejercicio.ExerciciId, noms);
  });
  return map;
});

const musculoStats = computed(() => {
  const stats = new Map<string, { series: number; reps: number; carga: number }>();
  if (!ejercicios.value.length || !series.value.length) return [];

  series.value.forEach(s => {
    const ej = ejercicios.value.find(e => e.ExerciciId === s.ExerciciId);
    if (!ej) return;
    const gmIds = [ej.GrupMuscular1, ej.GrupMuscular2, ej.GrupMuscular3, ej.GrupMuscular4, ej.GrupMuscular5].filter(Boolean) as number[];
    if (!gmIds.length) return;
    gmIds.forEach(gmId => {
      const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === gmId);
      if (!grupo) return;
      if (!stats.has(grupo.Nom)) stats.set(grupo.Nom, { series: 0, reps: 0, carga: 0 });
      const st = stats.get(grupo.Nom)!;
      st.series++;
      st.reps += s.Reps;
      st.carga += (s.Carga || s.Kg * s.Reps);
    });
  });

  const maxSeries = Math.max(...Array.from(stats.values()).map(v => v.series), 1);
  const maxReps = Math.max(...Array.from(stats.values()).map(v => v.reps), 1);
  const maxCarga = Math.max(...Array.from(stats.values()).map(v => v.carga), 1);

  const sortKey: 'pctSeries' | 'pctReps' | 'pctCarga' = modoGrafico.value === 'series' ? 'pctSeries' : modoGrafico.value === 'reps' ? 'pctReps' : 'pctCarga';

  return Array.from(stats.entries()).map(([nom, v]) => ({
    nom,
    series: v.series,
    reps: v.reps,
    carga: v.carga,
    pctSeries: Math.round((v.series / maxSeries) * 100),
    pctReps: Math.round((v.reps / maxReps) * 100),
    pctCarga: Math.round((v.carga / maxCarga) * 100),
  })).sort((a, b) => b[sortKey] - a[sortKey]);
});

// Card view helpers
const serieActual = computed(() => seriesCardOrder.value[serieActualIdx.value] || null);

// Vista condensada de los dots de paginación: si hay más de 10 tarjetas no mostramos
// un dot por elemento (evita scroll lateral). Mostramos primera, última y un entorno
// alrededor de la tarjeta actual, con elipsis donde hay saltos.
const dotsView = computed(() => {
  const total = seriesCardOrder.value.length;
  if (total <= 10) {
    return seriesCardOrder.value.map((s, i) => ({
      kind: 'dot' as const, idx: i, key: 'd' + s.SerieId
    }));
  }
  const cur = serieActualIdx.value;
  const idxs = Array.from(new Set([0, cur - 1, cur, cur + 1, total - 1]))
    .filter(i => i >= 0 && i < total)
    .sort((a, b) => a - b);
  const items: Array<{ kind: 'dot' | 'break'; idx?: number; key: string }> = [];
  let prev = -2;
  for (const i of idxs) {
    if (i - prev > 1) items.push({ kind: 'break', key: 'b' + i });
    items.push({ kind: 'dot', idx: i, key: 'd' + seriesCardOrder.value[i].SerieId });
    prev = i;
  }
  return items;
});

const nombreEjercicio = (serie: any) => {
  return ejercicios.value.find(e => e.ExerciciId === serie.ExerciciId)?.Nom || 'Ejercicio desconocido';
};

const gruposMuscularesDeSerie = (serie: any): string[] => {
  const ej = ejercicios.value.find(e => e.ExerciciId === serie.ExerciciId);
  if (!ej) return [];
  const ids = [ej.GrupMuscular1, ej.GrupMuscular2, ej.GrupMuscular3, ej.GrupMuscular4, ej.GrupMuscular5]
    .filter((id): id is number => id !== null && id !== undefined);
  return ids
    .map(id => gruposMusculares.value.find(g => g.GrupMuscularId === id)?.Nom)
    .filter((nom): nom is string => !!nom);
};

const isCompletada = (serieId: number) => completadasMap.value[serieId] ?? false;

const cargarCompletadas = () => {
  const map: Record<number, boolean> = {};
  series.value.forEach(s => { map[s.SerieId] = (s as any).Completada === 1; });
  completadasMap.value = map;
};

const restTimer = useRestTimer();

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
  if (newState) restTimer.iniciarAuto(); // temporizador de descanso (solo al marcar, no al desmarcar)
  try {
    await apiFetch('/api/toggleSerieCompletada', { serieId, completada: newState });
  } catch {
    setLocal(currentState);
    alertWindow('Error al guardar el estado de la serie');
  }
};

const avanzaSerie = () => {
  if (serieActualIdx.value < seriesCardOrder.value.length - 1) {
    direction.value = 'next';
    serieActualIdx.value++;
    editandoCard.value = false;
  }
};

const retrocedeSerie = () => {
  if (serieActualIdx.value > 0) {
    direction.value = 'prev';
    serieActualIdx.value--;
    editandoCard.value = false;
  }
};

const irAPrimeraTarjeta = () => {
  if (seriesCardOrder.value.length === 0) return;
  direction.value = 'prev';
  serieActualIdx.value = 0;
  editandoCard.value = false;
};

const irAUltimaTarjeta = () => {
  if (seriesCardOrder.value.length === 0) return;
  direction.value = 'next';
  serieActualIdx.value = seriesCardOrder.value.length - 1;
  editandoCard.value = false;
};

const primerIdxNoCompletado = () => {
  for (let i = 0; i < seriesCardOrder.value.length; i++) {
    if (!isCompletada(seriesCardOrder.value[i].SerieId)) return i;
  }
  return 0;
};

const cambiarModoTarjetas = () => {
  modoVisualizacion.value = 'tarjetas';
  direction.value = 'next';
  // Si hay una posición guardada de este entreno la respetamos; si no, la primera serie sin completar
  const guardada = leerVista(entrenoId);
  serieActualIdx.value = resolverIndiceTarjeta(guardada?.serieId, seriesCardOrder.value, primerIdxNoCompletado);
  editandoCard.value = false;
};

// Restaura modo y tarjeta al cargar (una sola vez, cuando ya hay series)
const restaurarVista = () => {
  if (vistaRestaurada.value) return;
  vistaRestaurada.value = true;
  const guardada = leerVista(entrenoId);
  if (!guardada) return;
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
  guardarVista(entrenoId, { modo: modoVisualizacion.value, serieId: serieIdVista.value });
});

const iniciarEdicionCard = () => {
  if (!serieActual.value) return;
  cardEditData.value = {
    ejercicioId: serieActual.value.ExerciciId,
    kg: serieActual.value.Kg,
    reps: serieActual.value.Reps
  };
  cardError.value = '';
  editandoCard.value = true;
};

const cancelarEdicionCard = () => {
  editandoCard.value = false;
};

const guardarEdicionCard = async (valores: { ejercicioId: number; kg: number; reps: number }) => {
  if (!serieActual.value || !entreno.value) return;
  const serieId = serieActual.value.SerieId;
  cardGuardando.value = true;
  cardError.value = '';
  try {
    const data = await apiFetch<any>('/api/editSerie', {
      serieId,
      entrenoId: entreno.value.EntrenoId,
      exerciciId: valores.ejercicioId,
      kg: valores.kg,
      reps: valores.reps
    });
    onSerieUpdated({ data, serieId, entrenoId: entreno.value.EntrenoId, exerciciId: valores.ejercicioId, kg: valores.kg, reps: valores.reps });
    editandoCard.value = false;
  } catch {
    cardError.value = 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
  } finally {
    cardGuardando.value = false;
  }
};

const eliminarCard = async () => {
  if (!serieActual.value) return;
  if (!confirm('¿Eliminar esta serie?')) return;
  try {
    const data = await apiFetch<any>('/api/deleteSerie', { serieId: serieActual.value.SerieId });
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
  touchStartTime.value = Date.now();
  touchMoved.value = false;
};

const onTouchMove = (e: TouchEvent) => {
  const dx = Math.abs(e.touches[0].clientX - touchStartX.value);
  const dy = Math.abs(e.touches[0].clientY - touchStartY.value);
  if (dx > 10 || dy > 10) touchMoved.value = true;
};

const onTouchEnd = (e: TouchEvent) => {
  if (!touchMoved.value) return;
  const dx = e.changedTouches[0].clientX - touchStartX.value;
  const dy = e.changedTouches[0].clientY - touchStartY.value;
  if (Math.abs(dx) >= 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx > 0) retrocedeSerie();
    else avanzaSerie();
  }
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
    const data = await apiFetch<{ entreno: any[]; series: any[] }>('/api/getEntreno', { entrenoId });
    entreno.value = data.entreno[0];
    if (entreno.value) entreno.value.CargaTotal = parseFloat((entreno.value.CargaTotal / 1000).toFixed(2));
    series.value = data.series;
    cargarCompletadas();
    restaurarVista();

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
    ejercicios.value = await apiFetch<any[]>('/api/getExercicis', {});

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
    const data = await apiFetch<any[]>('/api/getGrupsMusculars', {});
    gruposMusculares.value = Array.isArray(data) ? data : [];
  } catch (e) { console.error(e); }
};

watch(() => nuevaSerie.value.ejercicioId, (newId) => {
  if (newId) {
    try { localStorage.setItem('lastSelectedExerciseId', newId.toString()); } catch { /* sin almacenamiento */ }
    lastExercise.value = newId;
    // Al cambiar de ejercicio con el formulario abierto, tomamos su última serie como base
    if (showForm.value) prefillDesdeUltimaSerie();
  }
});

// El formulario avisa cuando el usuario elige otro ejercicio
const onEjercicioNuevaSerie = (id: number) => { nuevaSerie.value.ejercicioId = id; };

// Acciones Principales
const guardarSerie = async (valores: { ejercicioId: number; kg: number; reps: number }) => {
  // Mantenemos lo enviado como valores de partida de la siguiente serie
  nuevaSerie.value = { ...valores };
  nuevaSerieError.value = '';

  try {
    isSaving.value = true;
    const data = await apiFetch<any>('/api/novaSerie', {
      entrenoId, exerciciId: nuevaSerie.value.ejercicioId, kg: nuevaSerie.value.kg, reps: nuevaSerie.value.reps
    });
    
    if (data.newPr) celebrarPr(nuevaSerie.value.ejercicioId, nuevaSerie.value.kg, nuevaSerie.value.reps);

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

    // Mantenemos ejercicio, peso y reps: la siguiente serie suele ser igual (un toque para repetirla)
    showForm.value = false;
  } catch (e: any) {
    nuevaSerieError.value = e?.message || 'No se pudo guardar la serie. Inténtalo de nuevo.';
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
  if (data?.newPr) celebrarPr(exerciciId, kg, reps);
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
    const data = await apiFetch<any>('/api/editEntreno', {
      entrenoId: entreno.value.EntrenoId,
      descripcio: entrenoEditado.value.descripcio,
      puntuacio: entrenoEditado.value.puntuacio
    });

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
    await apiFetch('/api/reorderSerie', { entrenoId, serieId: moved.SerieId, newIndex: toIdx });
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
    
    <div v-if="showPrAlert" class="toast toast-pr" role="status"><strong>🏆 Nuevo récord personal</strong>{{ prMessage }}</div>
    <div v-if="showEjercicioAlert" class="toast toast-success">{{ ejercicioAlertMessage }}</div>
    <div v-if="showAlert" class="toast toast-warning">{{ alertMessage }}</div>
    
    <div v-if="isLoading" class="state-box"><p>Cargando...</p></div>
    <div v-else-if="error" class="state-box error"><p>{{ error }}</p><button @click="loadEntreno" class="btn">Reintentar</button></div>
    
    <div v-else-if="entreno" class="entreno-details">
      <!-- PANEL RESUMEN (colapsable, cerrado por defecto) -->
      <div class="collapsible-panel">
        <button type="button" class="collapsible-header" :aria-expanded="showResumen" aria-controls="panel-resumen" @click="showResumen = !showResumen">
          <span>Resumen del entreno</span>
          <span class="chevron" :class="{ open: showResumen }" aria-hidden="true">▶</span>
        </button>
        <div id="panel-resumen" class="collapsible-body" :class="{ open: showResumen }">
          <div class="resumen-stats">
            <div class="resumen-stat"><span class="value">{{ entreno.CargaTotal }} t</span><span class="label">Peso total</span></div>
            <div class="resumen-stat"><span class="value">{{ series.length }}</span><span class="label">Series</span></div>
            <div class="resumen-stat"><span class="value">{{ ejerciciosUnicos }}</span><span class="label">Ejercicios</span></div>
          </div>
          <div v-if="musculoStats.length" class="musculo-graph">
            <div class="graph-toggle">
              <button class="toggle-btn" :class="{ active: modoGrafico === 'series' }" @click="modoGrafico = 'series'">Series</button>
              <button class="toggle-btn" :class="{ active: modoGrafico === 'reps' }" @click="modoGrafico = 'reps'">Reps</button>
              <button class="toggle-btn" :class="{ active: modoGrafico === 'carga' }" @click="modoGrafico = 'carga'">Carga (kg)</button>
            </div>
            <div class="graph-bars">
              <div v-for="m in musculoStats" :key="m.nom" class="graph-row">
                <span class="graph-label">{{ m.nom }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: (modoGrafico === 'series' ? m.pctSeries : modoGrafico === 'reps' ? m.pctReps : m.pctCarga) + '%' }"></div>
                </div>
                <span class="graph-value">
                  <template v-if="modoGrafico === 'series'">{{ m.series }}</template>
                  <template v-else-if="modoGrafico === 'reps'">{{ m.reps }}</template>
                  <template v-else>{{ m.carga }} kg</template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DATOS DEL ENTRENO (colapsable, cerrado por defecto) -->
      <div class="collapsible-panel">
        <button type="button" class="collapsible-header" :aria-expanded="showDatos" aria-controls="panel-datos" @click="showDatos = !showDatos">
          <span>Datos del entreno</span>
          <span class="chevron" :class="{ open: showDatos }" aria-hidden="true">▶</span>
        </button>
        <div id="panel-datos" class="collapsible-body" :class="{ open: showDatos }">
          <div v-if="!editandoEntreno">
            <div class="info-row"><span class="label">Fecha:</span><span class="value">{{ formatDateTitle(entreno.Data) }}</span></div>
            <div class="info-row"><span class="label">Descripción:</span><span class="value">{{ entreno.Descripcio || '-' }}</span></div>
            <div class="info-row"><span class="label">Puntuación:</span>
              <span class="value"><span v-for="i in 5" :key="i" class="star" :class="{ filled: entreno.Puntuacio && i <= entreno.Puntuacio }">★</span></span>
            </div>
            <button @click="iniciarEdicionEntreno" class="btn btn-secondary" style="width:100%;margin-top:0.5rem;">Editar info</button>
          </div>
          <div v-else class="entreno-edit-form">
            <div class="form-group"><label>Descripción:</label><textarea v-model="entrenoEditado.descripcio" class="form-control"></textarea></div>
            <div class="form-group">
              <label>Puntuación:</label>
              <div class="rating-input"><button v-for="i in 5" :key="i" class="star-btn btn" :class="{ filled: i <= entrenoEditado.puntuacio }" @click="entrenoEditado.puntuacio = i">★</button></div>
            </div>
            <p class="caption" style="margin:0.5rem 0 0;">El nombre se edita desde el título de la página.</p>
            <div class="form-actions">
              <button @click="editandoEntreno = false" class="btn btn-secondary">Cancelar</button>
              <button @click="guardarCambiosEntreno" class="btn btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      </div>
      
      <h2 class="section-title">Series</h2>
      
      <div v-if="!showForm" class="add-serie">
        <button @click="abrirFormularioSerie" class="btn btn-primary btn-lg">+ Añadir serie</button>
      </div>

      <!-- Toggle vista Lista / Tarjetas -->
      <div v-if="series.length > 0" class="view-toggle">
        <button class="toggle-btn" :class="{ active: modoVisualizacion === 'lista' }" @click="modoVisualizacion = 'lista'">Lista</button>
        <button class="toggle-btn" :class="{ active: modoVisualizacion === 'tarjetas' }" @click="cambiarModoTarjetas">Tarjetas</button>
        <button v-if="restTimer.habilitado.value" class="toggle-btn" aria-label="Iniciar temporizador de descanso" @click="restTimer.iniciar()">⏱</button>
      </div>
      
      <!-- Formulario Nueva Serie -->
      <div v-if="showForm" class="serie-card new-serie-card">
        <div class="serie-info">
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
        </div>
      </div>
      
      <div v-if="series.length === 0 && !showForm" class="state-box empty-series">
        <p>Aún no hay series en este entreno.</p>
        <p class="caption">Pulsa «Añadir serie» o pide al entrenador IA que te proponga uno.</p>
      </div>
      
      <!-- MODO LISTA -->
      <div v-else-if="modoVisualizacion === 'lista'" class="series-list">
        <SerieItem 
          v-for="serie in seriesDisplay" 
          :key="serie.SerieId"
          :serie="serie"
          :ejercicios="ejercicios"
          :grupo-muscular-nombre="ejercicioGrupoMap.get(serie.ExerciciId)"
          :completada="isCompletada(serie.SerieId)"
          @serieUpdated="onSerieUpdated"
          @serieDeleted="onSerieDeleted"
          @serieCompletadaToggled="toggleCompletadoCard"
          @openModalEjercicio="abrirModalEjercicio"
          @editingChange="onEditingChange"
          @goToEjercicio="(id) => router.push(`/ejercicio/${id}`)"
          @dragStart="onDragStart"
          @drop="onDrop"
        />
      </div>
      
      <!-- MODO TARJETAS (Tinder swipe) -->
      <div v-else-if="serieActual" class="swipe-area" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend="onTouchEnd">
        <Transition :name="direction === 'next' ? 'slide-next' : 'slide-prev'" mode="out-in">
          <div :key="serieActual.SerieId" class="serie-card-slide-wrapper">
            <div v-if="!editandoCard" class="serie-card-big" :class="{ 'serie-done': isCompletada(serieActual.SerieId) }" @click="onCardTap(serieActual.SerieId)">
              <div class="big-ejercicio" @click.stop="router.push(`/ejercicio/${serieActual.ExerciciId}`)" style="cursor: pointer;">{{ nombreEjercicio(serieActual) }}</div>
              <div class="big-stats">
                <span class="big-kg">{{ serieActual.Kg }} kg</span>
                <span class="big-x">×</span>
                <span class="big-reps">{{ serieActual.Reps }}</span>
              </div>
              <div class="big-carga">{{ serieActual.Carga }} kg total</div>
              <div v-if="serieActual.PR" class="pr-badge">🏆 PR</div>
              <div v-if="gruposMuscularesDeSerie(serieActual).length" class="big-grupos">
                <span v-for="(nom, i) in gruposMuscularesDeSerie(serieActual)" :key="i" class="big-grupo-chip">{{ nom }}</span>
              </div>
              <div class="big-actions">
                <button class="btn btn-secondary btn-sm" @click.stop="iniciarEdicionCard">Editar</button>
                <button class="btn btn-quiet-danger btn-sm" @click.stop="eliminarCard">Eliminar</button>
              </div>
            </div>
            <div v-else class="serie-card-big editing-card">
              <SerieForm
                mode="editar"
                :ejercicio-id="cardEditData.ejercicioId"
                :kg="cardEditData.kg"
                :reps="cardEditData.reps"
                :ejercicios="ejercicios"
                :saving="cardGuardando"
                :error="cardError"
                @submit="guardarEdicionCard"
                @cancel="cancelarEdicionCard"
                @open-modal-ejercicio="abrirModalEjercicio"
              />
            </div>
          </div>
        </Transition>
      </div>
      <div v-else-if="modoVisualizacion === 'tarjetas'" class="state-box"><p>No hay series registradas.</p></div>

      <!-- Navigation + Dots de progreso (solo en modo tarjetas) -->
      <div v-if="modoVisualizacion === 'tarjetas' && seriesCardOrder.length > 0" class="card-nav-row">
        <button
          class="btn btn-secondary btn-sm card-nav-btn"
          @click="irAPrimeraTarjeta"
          :disabled="serieActualIdx === 0"
          aria-label="Primera tarjeta"
          title="Primera tarjeta"
        >⏮</button>
        <div class="card-dots">
          <template v-for="item in dotsView" :key="item.key">
            <span v-if="item.kind === 'dot'"
              class="dot"
              :class="{ active: item.idx === serieActualIdx, done: isCompletada(seriesCardOrder[item.idx!].SerieId) }"
              @click="serieActualIdx = item.idx!"></span>
            <span v-else class="dot-break">…</span>
          </template>
          <span class="dot-count">{{ serieActualIdx + 1 }} / {{ seriesCardOrder.length }}</span>
        </div>
        <button
          class="btn btn-secondary btn-sm card-nav-btn"
          @click="irAUltimaTarjeta"
          :disabled="serieActualIdx === seriesCardOrder.length - 1"
          aria-label="Última tarjeta"
          title="Última tarjeta"
        >⏭</button>
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
  
  <RestTimer />

  <!-- Chatbot conectado con @refresh para actualizar datos si la AI hace cambios -->
  <!-- Se oculta mientras hay un formulario de serie abierto (nueva o edición) para no tapar «Guardar» -->
  <Chatbot
    v-show="!hayFormularioAbierto"
    :entreno-id="entrenoId" 
    :entreno-data="entreno" 
    :series="series" 
    :ejercicios="ejercicios"
    @refresh="loadEntreno"
  />
</template>

<!-- Importamos el CSS externo -->
<style src="../styles/detalle-entreno.css"></style>

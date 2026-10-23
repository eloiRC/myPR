<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { applyChartTheme, roundedLineDataset, roundedChartOptions, CHART_COLORS } from '../utils/chartTheme';
import { useAuthStore } from '../stores/auth';
import { apiFetch } from '../services/api';
import { DURACION_MIN_SEG, DURACION_MAX_SEG, descansoAceptable, textoDescanso } from '../composables/useRestTimer';

import { ArrowLeft, Pencil, Timer, ChevronRight } from 'lucide-vue-next';
import SegDisplay from '../components/SegDisplay.vue';
import JudgeLights from '../components/JudgeLights.vue';
import BottomSheet from '../components/BottomSheet.vue';
import GrupoChips from '../components/listas/GrupoChips.vue';
import { kgDisplay } from '../utils/segmentos';

const authStore = useAuthStore();

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
applyChartTheme();

// Definir la interfaz para un ejercicio
interface Ejercicio {
  ExerciciId: number;
  Nom: string;
  UserId: number;
  PR: number;
  /** Descanso por defecto del ejercicio (s); null = usa el global */
  DescansoSeg?: number | null;
  GrupMuscular1: number | null;
  GrupMuscular2: number | null;
  GrupMuscular3: number | null;
  GrupMuscular4: number | null;
  GrupMuscular5: number | null;
  entrenoPr: {
    EntrenoId: number ;
    UserId: number ;
    Data: number ;
    CargaTotal: number;
    Nom: string;
    Descripcio: string;
    Puntuacio: number ;
  } | null
}

// Definir la interfaz para los grupos musculares
interface GrupoMuscular {
  GrupMuscularId: number;
  Nom: string;
}

// Definir la interfaz para el historial de pesos
interface PesoHistorial {
  Data: number;
  PesoMaximo: number;
}

// Definir la interfaz para el historial de carga
interface CargaHistorial {
  Data: number;
  CargaTotal: number;
}

const router = useRouter();
const route = useRoute();
const ejercicio = ref<Ejercicio | null>(null);
const gruposMusculares = ref<GrupoMuscular[]>([]);
const historialPesos = ref<PesoHistorial[]>([]);
const historialCarga = ref<CargaHistorial[]>([]);
const isLoading = ref(true);
const error = ref('');
const editando = ref(false);
const cargadoCompleto = computed(() => ejercicio.value !== null && gruposMusculares.value.length > 0);
const errorEdicion = ref('');
const ejercicioEditado = ref({ Nom: '' });
const gruposSeleccionados = ref<(number | null)[]>([]);
// Descanso por defecto (opcional): vacío = el global del usuario
const descansoEditado = ref<number | null>(null);
const onDescansoInput = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value.trim();
  descansoEditado.value = raw === '' ? null : Math.round(Number(raw));
};

const iniciarEdicion = () => {
  if (!ejercicio.value) return;
  ejercicioEditado.value = { Nom: ejercicio.value.Nom };
  descansoEditado.value = ejercicio.value.DescansoSeg ?? null;
  gruposSeleccionados.value = [
    ejercicio.value.GrupMuscular1,
    ejercicio.value.GrupMuscular2,
    ejercicio.value.GrupMuscular3,
    ejercicio.value.GrupMuscular4,
    ejercicio.value.GrupMuscular5
  ];
  editando.value = true;
  errorEdicion.value = '';
  instantaneaInicial.value = instantanea();
};

const cancelarEdicion = () => { editando.value = false; };

// Foto del formulario al abrirlo, para saber si hay cambios sin guardar
const instantanea = () => JSON.stringify([
  ejercicioEditado.value.Nom,
  descansoEditado.value,
  [...gruposSeleccionados.value].filter(g => g !== null).sort(),
]);
const instantaneaInicial = ref('');
const hayCambios = () => editando.value && instantanea() !== instantaneaInicial.value;

// Cerrar la hoja de edición (X, fondo, Escape o Cancelar), avisando si hay cambios
const cerrarEdicion = () => {
  if (hayCambios() && !confirm('Hay cambios sin guardar. ¿Salir de todas formas?')) return;
  cancelarEdicion();
};

// Nombres de los grupos musculares del ejercicio actual
const gruposActuales = computed<string[]>(() => {
  const e = ejercicio.value;
  if (!e) return [];
  return [e.GrupMuscular1, e.GrupMuscular2, e.GrupMuscular3, e.GrupMuscular4, e.GrupMuscular5]
    .filter((g): g is number => !!g)
    .map(getNombreGrupoMuscular);
});

const guardarEdicionEjercicio = async () => {
  if (!ejercicio.value) return;
  if (!ejercicioEditado.value.Nom.trim()) {
    errorEdicion.value = 'El nombre no puede estar vacío'; return;
  }
  const groups = gruposSeleccionados.value.filter((g): g is number => g !== null);
  if (groups.length === 0) {
    errorEdicion.value = 'Selecciona al menos un grupo muscular'; return;
  }
  const d = descansoEditado.value;
  if (!descansoAceptable(d)) {
    errorEdicion.value = `El descanso debe ser 0 (sin descanso) o estar entre ${DURACION_MIN_SEG} y ${DURACION_MAX_SEG} s`; return;
  }
  try {
    await apiFetch('/api/editExercici', {
      exerciciId: ejercicio.value.ExerciciId,
      nom: ejercicioEditado.value.Nom.trim(),
      grupsMusculars: groups,
      descansoSeg: d
    });
    await loadEjercicio();
    editando.value = false;
  } catch (e: any) {
    errorEdicion.value = e.message || 'Error al guardar';
  }
};

// Datos para la gráfica de PR
const chartData = computed(() => {
  if (!historialPesos.value.length) return null;
  
  // Sort by date ascending and map to labels and data
  const sortedData = [...historialPesos.value].sort((a, b) => a.Data - b.Data);
  
  const labels = sortedData.map(h => {
    const fecha = new Date(h.Data * 1000);
    return fecha.toLocaleDateString('es-ES', { 
      day: 'numeric',
      month: 'short'
    });
  });
  
  const data = sortedData.map(h => h.PesoMaximo);
  
  return {
    labels,
    datasets: [
      roundedLineDataset('Peso máximo (kg)', data, CHART_COLORS.pr)
    ]
  };
});

// Datos para la gráfica de carga
const chartDataCarga = computed(() => {
  if (!historialCarga.value.length) return null;
  
  // Sort by date ascending and map to labels and data
  const sortedData = [...historialCarga.value].sort((a, b) => a.Data - b.Data);
  
  const labels = sortedData.map(h => {
    const fecha = new Date(h.Data * 1000);
    return fecha.toLocaleDateString('es-ES', { 
      day: 'numeric',
      month: 'short'
    });
  });
  
  const data = sortedData.map(h => h.CargaTotal);
  
  return {
    labels,
    datasets: [
      roundedLineDataset('Carga total (kg)', data, CHART_COLORS.accent)
    ]
  };
});

// Opciones para la gráfica de PR
const chartOptions = roundedChartOptions({
  yTitle: 'Peso máximo (kg)',
  tooltipLabel: (v) => `Peso: ${v} kg`,
});

// Opciones para la gráfica de carga
const chartOptionsCarga = roundedChartOptions({
  yTitle: 'Carga total (kg)',
  tooltipLabel: (v) => `Carga: ${v} kg`,
});

// Cargar los datos del ejercicio
const loadEjercicio = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    const exerciciId = Number(route.params.id);

    const [ejercicioData, historialPesosData, historialCargaData] = await Promise.all([
      apiFetch<any>('/api/getExercici', { exerciciId }),
      apiFetch<any[]>('/api/getPesosHistorial', { exerciciId }),
      apiFetch<any[]>('/api/getCargaHistorial', { exerciciId })
    ]);

    ejercicio.value = ejercicioData;
    historialPesos.value = historialPesosData;
    historialCarga.value = historialCargaData;

    await loadGruposMusculares();

  } catch (err: any) {
    error.value = err.message || 'Error al cargar los datos';
    console.error('Error:', err);
  } finally {
    isLoading.value = false;
  }
};

// Ir al detalle de un entreno
const verDetalleEntreno = (entrenoId: number) => {
  router.push(`/entreno/${entrenoId}`);
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

// Obtener el nombre del grupo muscular
const getNombreGrupoMuscular = (id: number | null): string => {
  if (!id) return '';
  const grupo = gruposMusculares.value.find(g => g.GrupMuscularId === id);
  return grupo ? grupo.Nom : `ID: ${id}`;
};

// Volver a la lista de ejercicios
const volverAEjercicios = () => {
  if (hayCambios() && !confirm('Hay cambios sin guardar. ¿Salir de todas formas?')) return;
  router.push('/ejercicios');
};
// Formatear la fecha para mostrarla en formato legible
const formatDate = (timestamp: number): string => {
  if (!timestamp) return '-';
  
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
};

// Cargar los datos al montar el componente
onMounted(loadEjercicio);
</script>

<template>
  <div class="page detalle">
    <header class="cab">
      <button type="button" class="icono" @click="volverAEjercicios" aria-label="Volver a ejercicios"><ArrowLeft :size="22" /></button>
      <h1 class="cab-titulo">{{ ejercicio?.Nom }}</h1>
      <button type="button" class="icono" :disabled="!cargadoCompleto" @click="iniciarEdicion" aria-label="Editar ejercicio"><Pencil :size="20" /></button>
    </header>

    <div v-if="isLoading" class="cargando" role="status" aria-live="polite">
      <div class="sk sk-hero"></div>
      <div class="sk sk-fila"></div>
      <div class="sk sk-chart"></div>
      <span class="sr-only">Cargando datos del ejercicio...</span>
    </div>

    <div v-else-if="error" class="state-box error" role="alert">
      <p>{{ error }}</p>
      <button @click="loadEjercicio" class="btn">Reintentar</button>
    </div>

    <div v-else-if="ejercicio" class="ejercicio-content">
      <!-- Marcador del récord -->
      <section class="hero" aria-label="Récord personal">
        <div class="hero-top">
          <span class="hero-rotulo">Récord personal</span>
          <JudgeLights :lit="ejercicio.PR > 0 ? 3 : 0" size="md" :label="ejercicio.PR > 0 ? 'Récord registrado' : 'Sin récord'" />
        </div>
        <div v-if="ejercicio.PR > 0" class="hero-valor">
          <SegDisplay :value="kgDisplay(ejercicio.PR)" tone="white" :label="`${kgDisplay(ejercicio.PR).replace('.', ',')} kg`" class="hero-seg" />
          <span class="hero-unidad">kg</span>
        </div>
        <div v-else class="hero-valor">
          <SegDisplay value="--" tone="muted" label="Sin récord" class="hero-seg" />
          <span class="hero-unidad">kg</span>
        </div>
        <div class="hero-grupos" v-if="gruposActuales.length">
          <span v-for="(g, i) in gruposActuales" :key="i" class="grupo">{{ g }}</span>
        </div>
        <p class="hero-descanso">
          <Timer :size="16" aria-hidden="true" />
          Descanso
          <strong>{{ ejercicio.DescansoSeg != null ? textoDescanso(ejercicio.DescansoSeg) : 'global' }}</strong>
        </p>
      </section>

      <!-- Entreno del PR -->
      <section v-if="ejercicio.entrenoPr" aria-labelledby="pr-entreno-t">
        <h2 id="pr-entreno-t" class="section-title">Entreno del PR</h2>
        <button type="button" class="fila-pr" @click="verDetalleEntreno(ejercicio.entrenoPr.EntrenoId)">
          <span class="fila-pr-texto">
            <span class="fila-pr-nombre">{{ ejercicio.entrenoPr.Nom }}</span>
            <span class="fila-pr-fecha">{{ formatDate(ejercicio.entrenoPr.Data) }}</span>
          </span>
          <span class="fila-pr-carga">
            <SegDisplay :value="kgDisplay(ejercicio.entrenoPr.CargaTotal)" tone="muted" :label="`Carga total ${kgDisplay(ejercicio.entrenoPr.CargaTotal).replace('.', ',')} kg`" class="fila-pr-seg" />
            <span class="fila-pr-unidad">kg</span>
          </span>
          <ChevronRight :size="18" class="fila-pr-chev" aria-hidden="true" />
        </button>
      </section>
      <p v-else class="sin-pr">Este ejercicio aún no tiene un PR registrado.</p>

      <!-- Gráfica de evolución -->
      <div class="chart-panel">
        <h2>Evolución del peso máximo</h2>
        <div v-if="chartData" class="chart-wrap">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div v-else class="no-datos">
          <p>No hay datos históricos disponibles</p>
        </div>
      </div>

      <!-- Gráfica de carga -->
      <div class="chart-panel">
        <h2>Evolución de la carga total</h2>
        <div v-if="chartDataCarga" class="chart-wrap">
          <Line :data="chartDataCarga" :options="chartOptionsCarga" />
        </div>
        <div v-else class="no-datos">
          <p>No hay datos históricos disponibles</p>
        </div>
      </div>
    </div>

    <!-- Editar ejercicio -->
    <BottomSheet :open="editando" title="Editar ejercicio" @close="cerrarEdicion">
      <form @submit.prevent="guardarEdicionEjercicio" class="hoja-form">
        <div class="form-group">
          <label for="edit-nombre">Nombre</label>
          <input id="edit-nombre" v-model="ejercicioEditado.Nom" class="form-control" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Grupos musculares</label>
          <GrupoChips v-model="gruposSeleccionados" :grupos="gruposMusculares" />
        </div>
        <div class="form-group descanso-ejercicio">
          <label for="edit-descanso">Descanso por defecto (s), opcional</label>
          <input id="edit-descanso" type="number" inputmode="numeric" class="form-control" min="0" :max="DURACION_MAX_SEG" step="5" :value="descansoEditado ?? ''" placeholder="Global (0 = sin descanso)" @input="onDescansoInput" />
          <p class="descanso-ayuda">Vacío = el descanso global de Ajustes. Cada serie puede tener el suyo.</p>
        </div>
        <div v-if="errorEdicion" class="error-message" role="alert">{{ errorEdicion }}</div>
        <div class="form-actions">
          <button type="button" @click="cerrarEdicion" class="btn btn-secondary">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </BottomSheet>
  </div>
</template>

<style scoped>
.detalle { padding-bottom: calc(var(--bottom-nav-h) + 1.5rem); }

.cab { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.cab-titulo {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 6vw, 1.9rem);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.05;
  overflow-wrap: anywhere;
}
.icono {
  width: var(--touch-min);
  height: var(--touch-min);
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--n1);
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  box-shadow: var(--bevel);
  color: var(--n7);
  cursor: pointer;
}
.icono:hover:not(:disabled) { background: var(--n2); color: var(--n8); }
.icono:disabled { opacity: 0.35; cursor: not-allowed; }
.icono:focus-visible { outline: 2px solid var(--judge-white); outline-offset: 2px; }

.ejercicio-content { display: flex; flex-direction: column; gap: 1.25rem; }

.hero {
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  box-shadow: var(--bevel);
  padding: 1rem 1rem 1.1rem;
}
.hero-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
.hero-rotulo {
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--n6);
}
.hero-valor { display: flex; align-items: flex-end; gap: 0.6rem; margin-bottom: 1rem; }
.hero-seg { font-size: clamp(4.5rem, 24vw, 6.5rem); }
.hero-unidad {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--n6);
  line-height: 1;
  padding-bottom: 0.15rem;
}
.hero-grupos { display: flex; flex-wrap: wrap; gap: 0.35rem 0.45rem; margin-bottom: 0.9rem; }
.grupo {
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--n4);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--n7);
}
.hero-descanso {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  padding-top: 0.8rem;
  border-top: 1px solid var(--n3);
  font-size: 0.85rem;
  color: var(--n6);
}
.hero-descanso strong { color: var(--n8); font-variant-numeric: tabular-nums; }

.fila-pr {
  width: 100%;
  min-height: 4rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem 0.7rem 1rem;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  box-shadow: var(--bevel);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.fila-pr:hover { background: var(--n2); border-color: var(--n4); }
.fila-pr:focus-visible { outline: 2px solid var(--judge-white); outline-offset: 2px; }
.fila-pr-texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.fila-pr-nombre {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.1;
}
.fila-pr-fecha { font-size: 0.8rem; color: var(--n6); font-variant-numeric: tabular-nums; }
.fila-pr-carga { display: flex; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
.fila-pr-seg { font-size: 1.4rem; }
.fila-pr-unidad { font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: var(--n6); text-transform: uppercase; line-height: 1; }
.fila-pr-chev { color: var(--n5); flex-shrink: 0; }

.sin-pr {
  margin: 0;
  padding: 1rem;
  border: 1px dashed var(--n4);
  border-radius: var(--radius-lg);
  color: var(--n6);
  text-align: center;
}
.chart-panel { margin-bottom: 0; }
.no-datos { text-align: center; padding: 2rem; color: var(--n6); font-size: 0.9rem; }
.no-datos p { margin: 0; }

.descanso-ejercicio input { max-width: 12rem; }
.descanso-ayuda { margin: 0.5rem 0 0; font-size: 0.8rem; color: var(--n6); }
.hoja-form .form-actions { margin-top: 1.25rem; }

.sk {
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  margin-bottom: 1rem;
  animation: pulso 1.4s ease-in-out infinite;
}
.sk-hero { height: 12rem; }
.sk-fila { height: 4rem; }
.sk-chart { height: 14rem; }
@keyframes pulso { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
</style>

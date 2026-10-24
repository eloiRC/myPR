<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { apiFetch } from '../services/api';
import { eliminarConDeshacer } from '../composables/useDeshacer';
import { applyChartTheme, roundedBarDataset, roundedChartOptions } from '../utils/chartTheme';

import { ChevronLeft, ChevronRight, Plus, ExternalLink, Trash2 } from 'lucide-vue-next';
import SegDisplay from '../components/SegDisplay.vue';
import BottomSheet from '../components/BottomSheet.vue';
import FilaEntreno from '../components/listas/FilaEntreno.vue';

const authStore = useAuthStore();

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
applyChartTheme();

// Definir la interfaz para un entreno
interface Entreno {
  EntrenoId: number;
  UserId: number;
  Data: number; // Timestamp en segundos
  CargaTotal: number;
  Nom: string;
}

const router = useRouter();
const entrenos = ref<Entreno[]>([]);
const isLoading = ref(true);
const error = ref('');

// Estado para el rango de fechas
const fechaInicio = ref(0);
const fechaFin = ref(0);
const rangoSeleccionado = ref<'7d' | '30d' | '90d'>('30d');
const diasDesplazamiento = ref<number>(0);

// Ordenar entrenos por fecha (más recientes primero)
const entrenosOrdenados = computed(() => {
  return [...entrenos.value].sort((a, b) => b.Data - a.Data);
});

// Datos para la gráfica de carga de entrenamiento
const chartData = computed(() => {
  const entrenosPorDia = new Map<string, number>();

  const startMs = fechaInicio.value * 1000;
  const endMs = fechaFin.value * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  for (let t = startMs; t <= endMs; t += oneDay) {
    const fechaStr = new Date(t).toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
    entrenosPorDia.set(fechaStr, 0);
  }

  entrenos.value.forEach(entreno => {
    const fecha = new Date(entreno.Data * 1000);
    const fechaStr = fecha.toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
    if (entrenosPorDia.has(fechaStr)) {
      entrenosPorDia.set(fechaStr, (entrenosPorDia.get(fechaStr) || 0) + entreno.CargaTotal);
    }
  });

  return {
    labels: Array.from(entrenosPorDia.keys()),
    datasets: [{
      ...roundedBarDataset('Peso total (t)', Array.from(entrenosPorDia.values())),
    }]
  };
});

// Opciones para la gráfica
const chartOptions = roundedChartOptions({
  yTitle: 'Peso (t)',
  tooltipLabel: (v) => `Carga: ${v} t`,
});
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

// Función para actualizar el rango de fechas según el preset seleccionado
const actualizarRangoFechas = (preset: '7d' | '30d' | '90d', desplazamiento: number = 0) => {
  const now = Math.floor(Date.now() / 1000);
  let dias = 30; // Por defecto 30 días
  
  switch (preset) {
    case '7d':
      dias = 7;
      break;
    case '90d':
      dias = 90;
      break;
  }
  
  const desplazamientoSegundos = desplazamiento * dias * 24 * 60 * 60;

  fechaFin.value = now + desplazamientoSegundos;
  fechaInicio.value = fechaFin.value - (dias * 24 * 60 * 60);

  rangoSeleccionado.value = preset;
  diasDesplazamiento.value = desplazamiento;
  loadEntrenos();
};

const navegarTiempo = (direccion: 'anterior' | 'siguiente') => {
  const desplazamiento = direccion === 'anterior' ? -1 : 1;
  actualizarRangoFechas(rangoSeleccionado.value, diasDesplazamiento.value + desplazamiento);
};

const loadEntrenos = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;

    const data = await apiFetch<any[]>('/api/getEntrenos', {
      dataInici: fechaInicio.value,
      dataFi: fechaFin.value
    });
    
    if (Array.isArray(data)) {
      entrenos.value = data;
      for (let i = 0; i < entrenos.value.length; i++) {
        entrenos.value[i].CargaTotal = parseFloat((entrenos.value[i].CargaTotal / 1000).toFixed(2));
      }
    } else {
      entrenos.value = [];
    }
  } catch (err: any) {
    error.value = err.message || 'Error al cargar los entrenos';
    console.error('Error al cargar entrenos:', err);
  } finally {
    isLoading.value = false;
  }
};

// Ir al detalle de un entreno
const verDetalleEntreno = (entrenoId: number) => {
  router.push(`/entreno/${entrenoId}`);
};

// Crear un nuevo entreno
const crearNuevoEntreno = async () => {
  try {
    isLoading.value = true;
    const data = await apiFetch<{ entrenoId: number }>('/api/nouEntreno', {});
    router.push(`/entreno/${data.entrenoId}`);
  } catch (err: any) {
    error.value = err.message || 'Error al crear nuevo entreno';
    console.error('Error al crear entreno:', err);
  } finally {
    isLoading.value = false;
  }
};

// Eliminar un entreno completo (con opción de deshacer unos segundos)
const eliminarEntreno = (entrenoId: number) => {
  const idx = entrenos.value.findIndex(e => e.EntrenoId === entrenoId);
  const entreno = entrenos.value[idx];
  if (!entreno) return;
  eliminarConDeshacer({
    mensaje: 'Entreno eliminado',
    aplicar: () => { entrenos.value = entrenos.value.filter(e => e.EntrenoId !== entrenoId); },
    revertir: () => {
      if (entrenos.value.some(e => e.EntrenoId === entrenoId)) return;
      const copia = [...entrenos.value];
      copia.splice(Math.min(idx, copia.length), 0, entreno);
      entrenos.value = copia;
    },
    confirmar: async () => {
      try {
        await apiFetch('/api/deleteEntreno', { entrenoId });
      } catch (err: any) {
        error.value = err.message || 'Error al eliminar entreno';
        throw err;
      }
    },
  });
};

// Menú de acciones de un entreno (hoja inferior)
const menuEntreno = ref<Entreno | null>(null);
const abrirDesdeMenu = () => {
  const e = menuEntreno.value;
  menuEntreno.value = null;
  if (e) verDetalleEntreno(e.EntrenoId);
};
const eliminarDesdeMenu = () => {
  const e = menuEntreno.value;
  menuEntreno.value = null;
  if (e) eliminarEntreno(e.EntrenoId);
};

// Inicializar el rango de fechas al montar el componente
onMounted(() => {
  actualizarRangoFechas('30d');
});
</script>

<template>
  <div class="page entrenos">
    <header class="marcador">
      <div class="marcador-top">
        <h1>Mis entrenos</h1>
        <button type="button" @click="crearNuevoEntreno" class="btn btn-primary btn-sm" :disabled="isLoading">
          <Plus :size="16" aria-hidden="true" /> Nuevo entreno
        </button>
      </div>

      <div class="switch" role="group" aria-label="Período">
        <button type="button" class="switch-nav" @click="navegarTiempo('anterior')" :disabled="isLoading" aria-label="Período anterior"><ChevronLeft :size="20" /></button>
        <button type="button" class="switch-btn" :class="{ active: rangoSeleccionado === '7d' }" :aria-pressed="rangoSeleccionado === '7d'" @click="actualizarRangoFechas('7d', diasDesplazamiento)">7 días</button>
        <button type="button" class="switch-btn" :class="{ active: rangoSeleccionado === '30d' }" :aria-pressed="rangoSeleccionado === '30d'" @click="actualizarRangoFechas('30d', diasDesplazamiento)">30 días</button>
        <button type="button" class="switch-btn" :class="{ active: rangoSeleccionado === '90d' }" :aria-pressed="rangoSeleccionado === '90d'" @click="actualizarRangoFechas('90d', diasDesplazamiento)">90 días</button>
        <button type="button" class="switch-nav" @click="navegarTiempo('siguiente')" :disabled="isLoading || diasDesplazamiento >= 0" aria-label="Período siguiente"><ChevronRight :size="20" /></button>
      </div>

      <p class="rango" v-if="fechaInicio > 0 && fechaFin > 0">
        {{ formatDate(fechaInicio) }} <span aria-hidden="true">—</span><span class="sr-only">hasta</span> {{ formatDate(fechaFin) }}
      </p>
    </header>

    <div v-if="isLoading" class="cargando" role="status" aria-live="polite">
      <div class="sk sk-chart"></div>
      <div class="sk sk-fila" v-for="n in 3" :key="n"></div>
      <span class="sr-only">Cargando entrenos...</span>
    </div>

    <div v-else-if="error" class="state-box error" role="alert">
      <p>{{ error }}</p>
      <button @click="loadEntrenos" class="btn">Reintentar</button>
    </div>

    <div v-else-if="entrenos.length === 0" class="vacio">
      <SegDisplay value="0.0" tone="muted" label="Sin carga en el período" class="vacio-seg" />
      <p class="vacio-texto">Sin entrenos en este período.</p>
      <button @click="crearNuevoEntreno" class="btn btn-primary btn-lg">Crear tu primer entreno</button>
    </div>

    <div v-else>
      <div class="chart-panel">
        <h2>Carga de entrenamiento · t</h2>
        <div class="chart-wrap">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <h2 class="section-title">{{ entrenosOrdenados.length }} {{ entrenosOrdenados.length === 1 ? 'entreno' : 'entrenos' }}</h2>
      <div class="entrenos-list">
        <FilaEntreno
          v-for="entreno in entrenosOrdenados"
          :key="entreno.EntrenoId"
          :nombre="entreno.Nom"
          :fecha="formatDate(entreno.Data)"
          :carga-t="entreno.CargaTotal"
          @abrir="verDetalleEntreno(entreno.EntrenoId)"
          @menu="menuEntreno = entreno"
        />
      </div>
    </div>

    <BottomSheet :open="menuEntreno !== null" :title="menuEntreno?.Nom" @close="menuEntreno = null">
      <div class="acciones" v-if="menuEntreno">
        <button type="button" class="accion" @click="abrirDesdeMenu">
          <ExternalLink :size="20" aria-hidden="true" /> Abrir entreno
        </button>
        <button type="button" class="accion accion-peligro" @click="eliminarDesdeMenu">
          <Trash2 :size="20" aria-hidden="true" /> Eliminar entreno
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.entrenos { padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 1.5rem); }

.marcador {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--n3);
}
.marcador-top {
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

/* Interruptor de hardware: carriles ranurados, la posición activa se enciende */
.switch {
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 3px;
  background: var(--n0);
  border: 1px solid var(--n4);
  border-radius: var(--radius-md);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
}
.switch-btn, .switch-nav {
  min-height: var(--touch-min);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--n6);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.switch-btn { flex: 1; white-space: nowrap; }
.switch-nav { width: var(--touch-min); display: grid; place-items: center; flex-shrink: 0; }
.switch-btn:hover:not(.active), .switch-nav:hover:not(:disabled) { color: var(--n8); background: var(--n2); }
.switch-btn.active {
  background: var(--n3);
  border-color: var(--led-amber);
  color: var(--led-amber);
  box-shadow: var(--bevel);
}
.switch-nav:disabled { opacity: 0.3; cursor: not-allowed; }
.switch-btn:focus-visible, .switch-nav:focus-visible { outline: 2px solid var(--judge-white); outline-offset: 1px; }

.rango {
  margin: 0.6rem 0 0;
  text-align: center;
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--n6);
  font-variant-numeric: tabular-nums;
}
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

/* Carga: esqueletos con la forma de lo que viene */
.sk {
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  animation: pulso 1.4s ease-in-out infinite;
}
.sk-chart { height: 200px; margin-bottom: 1.25rem; }
.sk-fila { height: 4rem; margin-bottom: 0.5rem; }
@keyframes pulso { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }

.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1rem;
  background: var(--n1);
  border: 1px solid var(--n3);
  border-radius: var(--radius-lg);
  text-align: center;
}
.vacio-seg { font-size: 3.5rem; }
.vacio-texto { margin: 0; color: var(--n7); }

.acciones { display: flex; flex-direction: column; gap: 0.5rem; }
.accion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 52px;
  padding: 0 1rem;
  background: var(--n2);
  border: 1px solid var(--n3);
  border-radius: var(--radius-md);
  color: var(--n8);
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.accion:hover { background: var(--n3); }
.accion-peligro { color: var(--led-red); }
.accion:focus-visible { outline: 2px solid var(--judge-white); outline-offset: 2px; }
</style>

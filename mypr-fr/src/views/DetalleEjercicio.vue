<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import {useAuthStore} from '../stores/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Usa la variable de entorno o el valor por defecto

const authStore = useAuthStore();


// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
  entrenoPr: {
    EntrenoId: number ;
    UserId: number ;
    Data: number ;
    CargaTotal: number;
    CargaTotalN:string
    Nom: string;
    Descripcio: string;
    Puntuacio: number ;
  }
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
      {
        label: 'Peso Máximo (kg)',
        backgroundColor: '#f97316',
        borderColor: '#f97316',
        borderWidth: 2,
        pointBackgroundColor: '#f97316',
        tension: 0.35,
        fill: true,
        data
      }
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
      {
        label: 'Carga Total (kg)',
        backgroundColor: '#14b8a6',
        borderColor: '#14b8a6',
        borderWidth: 2,
        pointBackgroundColor: '#14b8a6',
        tension: 0.35,
        fill: true,
        data
      }
    ]
  };
});

// Opciones para la gráfica de PR
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Peso Máximo (kg)'
      }
    },
    x: {
      title: {
        display: true,
        text: 'Fecha'
      }
    }
  },
  plugins: {
    legend: {
      display: true
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          return `Peso: ${context.raw} kg`;
        }
      }
    }
  }
};

// Opciones para la gráfica de carga
const chartOptionsCarga = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Carga Total (kg)'
      }
    },
    x: {
      title: {
        display: true,
        text: 'Fecha'
      }
    }
  },
  plugins: {
    legend: {
      display: true
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          return `Carga: ${context.raw} kg`;
        }
      }
    }
  }
};

// Cargar los datos del ejercicio
const loadEjercicio = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    const token = authStore.token;
    const exerciciId = Number(route.params.id);

    // Cargar datos del ejercicio
    const response = await fetch(API_URL+'/api/getExercici', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, exerciciId })
    });

    if (!response.ok) {
      throw new Error('Error al cargar el ejercicio');
    }

    const data = await response.json();
    ejercicio.value = data;
    
    // Cargar historial de pesos
    const responseHistorial = await fetch(API_URL+'/api/getPesosHistorial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, exerciciId })
    });

    if (!responseHistorial.ok) {
      throw new Error('Error al cargar el historial de pesos');
    }

    historialPesos.value = await responseHistorial.json();

    // Cargar historial de carga
    const responseCarga = await fetch(API_URL+'/api/getCargaHistorial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, exerciciId })
    });

    if (!responseCarga.ok) {
      throw new Error('Error al cargar el historial de carga');
    }

    historialCarga.value = await responseCarga.json();

    // Cargar grupos musculares
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
    const token = authStore.token;
    
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
    gruposMusculares.value = Array.isArray(data) ? data : data.results || [];
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
  <div class="page">
    <header class="page-header">
      <h1 class="page-title">{{ ejercicio?.Nom }}</h1>
      <div class="page-header-actions">
        <button @click="volverAEjercicios" class="btn btn-secondary">
        &larr; Volver
      </button>
      </div>
      
      
    </header>
    
    <div v-if="isLoading" class="state-box">
      <p>Cargando datos del ejercicio...</p>
    </div>
    
    <div v-else-if="error" class="state-box error">
      <p>{{ error }}</p>
      <button @click="loadEjercicio" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="ejercicio" class="ejercicio-content">
      <!-- Información del ejercicio -->
      <div class="card card-elevated">
        <div class="pr-display">
          <h2>PR Actual</h2>
          <p class="pr-valor">{{ ejercicio.PR }} kg</p>
        </div>
        
        <div class="grupos-musculares">
          <h3>Grupos Musculares</h3>
          <div class="grupos-tags">
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
      </div>
      <div class="entrenos-list">
        <h2 class="section-title">Entreno del PR</h2>
        <br>
        <div 
        class="list-card"
        @click="verDetalleEntreno(ejercicio.entrenoPr.EntrenoId)">
          
          <div class="list-card-body">
            <h3>{{ ejercicio.entrenoPr.Nom }}</h3>
            <p class="list-card-meta">{{ formatDate(ejercicio.entrenoPr.Data) }}</p>
            <p class="carga">Peso total: <strong class="list-card-highlight">{{ejercicio.entrenoPr.CargaTotal}} Kg</strong></p>
          </div>
          
        </div>
      </div>
      
      <!-- Gráfica de evolución -->
      <div class="chart-panel">
        <h2>Evolución del Peso Máximo</h2>
        <div v-if="chartData" class="chart-wrap">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div v-else class="no-datos">
          <p>No hay datos históricos disponibles</p>
        </div>
      </div>

      <!-- Gráfica de carga -->
      <div class="chart-panel">
        <h2>Evolución de la Carga Total</h2>
        <div v-if="chartDataCarga" class="chart-wrap">
          <Line :data="chartDataCarga" :options="chartOptionsCarga" />
        </div>
        <div v-else class="no-datos">
          <p>No hay datos históricos disponibles</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ejercicio-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.grupos-musculares h3 {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.grupos-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.no-datos {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.carga {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0.35rem 0 0;
}

</style>
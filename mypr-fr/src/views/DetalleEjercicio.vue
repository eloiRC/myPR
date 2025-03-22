<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import authService from '../services/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Usa la variable de entorno o el valor por defecto


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
        backgroundColor: '#FF8D67',
        borderColor: '#FF8D67',
        borderWidth: 2,
        pointBackgroundColor: '#FF8D67',
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
        backgroundColor: '#0F8B8D',
        borderColor: '#0F8B8D',
        borderWidth: 2,
        pointBackgroundColor: '#0F8B8D',
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
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    const token = authService.getToken();
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
  <div class="ejercicio-detalle-container">
    <header class="header">
      <h1 class="ejercicio-title">{{ ejercicio?.Nom }}</h1>
      <div class="header-buttons">
        <button @click="volverAEjercicios" class="btn btn-secondary">
        &larr; Volver
      </button>
      </div>
      
      
    </header>
    
    <div v-if="isLoading" class="loading">
      <p>Cargando datos del ejercicio...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadEjercicio" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="ejercicio" class="ejercicio-content">
      <!-- Información del ejercicio -->
      <div class="ejercicio-info">
        <div class="pr-actual">
          <h2>PR Actual</h2>
          <p class="pr-valor">{{ ejercicio.PR }} kg</p>
        </div>
        
        <div class="grupos-musculares">
          <h3>Grupos Musculares</h3>
          <div class="grupos-tags">
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
      </div>
      <div class="entrenos-list">
        <div 
        class="entreno-card"
        @click="verDetalleEntreno(ejercicio.entrenoPr.EntrenoId)">
          
          <div class="entreno-info">
            <h3>{{ ejercicio.entrenoPr.Nom }}</h3>
            <p class="date">{{ formatDate(ejercicio.entrenoPr.Data) }}</p>
            <p class="carga">Peso total: <strong class="num-carga">{{ ejercicio.entrenoPr.CargaTotal }} Tn</strong></p>
          </div>
          
        </div>
      </div>
      
      <!-- Gráfica de evolución -->
      <div class="grafica-container">
        <h2>Evolución del Peso Máximo</h2>
        <div v-if="chartData" class="grafica">
          <Line :data="chartData" :options="chartOptions" />
        </div>
        <div v-else class="no-datos">
          <p>No hay datos históricos disponibles</p>
        </div>
      </div>

      <!-- Gráfica de carga -->
      <div class="grafica-container">
        <h2>Evolución de la Carga Total</h2>
        <div v-if="chartDataCarga" class="grafica">
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
.ejercicio-detalle-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  padding-bottom: 80px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-buttons {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.ejercicio-title {
  margin: 0;
  font-size: 1.8rem;
}

.ejercicio-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.ejercicio-info {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.pr-actual {
  text-align: center;
  margin-bottom: 1.5rem;
}

.pr-actual h2 {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  color: var(--text-secondary);
}

.pr-valor {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--color-cobalt-blue);
  margin: 0;
}

.grupos-musculares h3 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.grupos-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.grupo-tag {
  background-color: var(--bg-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
  border: 1px solid var(--border);
}

.grafica-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.grafica-container h2 {
  margin: 0 0 1.5rem;
  font-size: 1.2rem;
}

.grafica {
  height: 300px;
  position: relative;
}

.no-datos {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
}

.loading, .error {
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
  border: 1px solid var(--accent-secondary);
  color: var(--accent-secondary);
}

.btn-secondary:hover {
  background-color: rgba(25, 86, 200, 0.1);
}
.entreno-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--border);
}

.entreno-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.entreno-info {
  flex: 1;
}

.entreno-info h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

.date {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.carga {
  font-size: 1rem;
  margin: 0.5rem 0;
 
}
.num-carga{
  color: var(--color-cobalt-blue);
}
</style>
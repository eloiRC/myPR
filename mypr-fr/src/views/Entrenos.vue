<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import authService from '../services/auth';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Usa la variable de entorno o el valor por defecto

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
let fechaInicio = 0;
let fechaFin = 0;
const rangoSeleccionado = ref<'7d' | '30d' | '90d'>('7d');
const diasDesplazamiento = ref<number>(0);

// Ordenar entrenos por fecha (más recientes primero)
const entrenosOrdenados = computed(() => {
  return [...entrenos.value].sort((a, b) => b.Data - a.Data);
});

// Datos para la gráfica de carga de entrenamiento
const chartData = computed(() => {
  // Crear un mapa para agrupar entrenos por día
  const entrenosPorDia = new Map<string, number>();
  
  // Obtener el rango de fechas según el preset seleccionado
  const now = new Date();
  let diasAMostrar = 7; // Por defecto 7 días
  
  switch (rangoSeleccionado.value) {
    case '30d':
      diasAMostrar = 30;
      break;
    case '90d':
      diasAMostrar = 90;
      break;
  }
  
  // Calcular las fechas para mostrar
  const fechas = Array.from({ length: diasAMostrar }, (_, i) => {
    const fecha = new Date(now);
    fecha.setDate(now.getDate() - (diasAMostrar - 1 - i));
    return fecha;
  });
  
  // Inicializar el mapa con las fechas y carga 0
  fechas.forEach(fecha => {
    const fechaStr = fecha.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric',
      month: 'short'
    });
    entrenosPorDia.set(fechaStr, 0);
  });
  
  // Sumar la carga de cada entreno al día correspondiente
  entrenos.value.forEach(entreno => {
    const fecha = new Date(entreno.Data * 1000);
    const fechaStr = fecha.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric',
      month: 'short'
    });
    
    // Si la fecha está dentro del rango, actualizar la carga
    if (entrenosPorDia.has(fechaStr)) {
      entrenosPorDia.set(fechaStr, (entrenosPorDia.get(fechaStr) || 0) + entreno.CargaTotal);
    }
  });
  
  // Convertir el mapa a arrays para la gráfica
  const labels = Array.from(entrenosPorDia.keys());
  const data = Array.from(entrenosPorDia.values());
  
  return {
    labels,
    datasets: [
      {
        label: 'Carga Total (kg)',
        backgroundColor: 'rgba(25, 86, 200, 0.2)',
        borderColor: 'rgba(25, 86, 200, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(25, 86, 200, 1)',
        data
      }
    ]
  };
});

// Opciones para la gráfica
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Carga (kg)'
      }
    },
    x: {
      title: {
        display: true,
        text: 'Día'
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
  let dias = 7; // Por defecto 7 días
  
  switch (preset) {
    case '30d':
      dias = 30;
      break;
    case '90d':
      dias = 90;
      break;
  }
  
  // Calcular el desplazamiento en segundos
  const desplazamientoSegundos = desplazamiento * dias * 24 * 60 * 60;
  
  // Actualizar las fechas con el desplazamiento
  fechaFin = now + desplazamientoSegundos;
  fechaInicio = fechaFin - (dias * 24 * 60 * 60);
  
  rangoSeleccionado.value = preset;
  diasDesplazamiento.value = desplazamiento;
  loadEntrenos();
};

// Función para navegar en el tiempo
const navegarTiempo = (direccion: 'anterior' | 'siguiente') => {
  const desplazamiento = direccion === 'anterior' ? -1 : 1;
  actualizarRangoFechas(rangoSeleccionado.value, diasDesplazamiento.value + desplazamiento);
};

// Modificar la función loadEntrenos para usar el rango de fechas
const loadEntrenos = async () => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    
    // Obtener el token de autenticación
    const token = authService.getToken();
    
    // Preparar los datos para la solicitud
    const requestData = {
      token,
      dataInici: fechaInicio,
      dataFi: fechaFin
    };
    
    // Hacer la solicitud a la API
    const response = await fetch(API_URL+'/api/getEntrenos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      
      throw new Error(`Error al cargar los entrenos: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Asegurarnos de que los datos recibidos sean un array
    if (Array.isArray(data)) {
      entrenos.value = data;
    } else if (data && typeof data === 'object') {
      entrenos.value = data.results || [];
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

// Navegar a la página de ejercicios
const irAEjercicios = () => {
  router.push('/ejercicios');
};

// Crear un nuevo entreno
const crearNuevoEntreno = async () => {
  try {
    isLoading.value = true;
    
    // Obtener el token de autenticación
    const token = authService.getToken();
    
    // Hacer la solicitud a la API
    const response = await fetch(API_URL+'/api/nouEntreno', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      throw new Error('Error al crear nuevo entreno');
    }
    
    const data = await response.json();
    
    // Redirigir al detalle del nuevo entreno
    router.push(`/entreno/${data.entrenoId}`);
  } catch (err: any) {
    error.value = err.message || 'Error al crear nuevo entreno';
    console.error('Error al crear entreno:', err);
  } finally {
    isLoading.value = false;
  }
};

// Inicializar el rango de fechas al montar el componente
onMounted(() => {
  actualizarRangoFechas('7d');
});
</script>

<template>
  <div class="entrenos-container">
    <header class="header">
      <h1>Mis Entrenos</h1>
      <div class="header-buttons">
        <button @click="irAEjercicios" class="btn btn-secondary" :disabled="isLoading">
          Mis Ejercicios
        </button>
        <button @click="crearNuevoEntreno" class="btn btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Cargando...' : 'Nuevo Entreno' }}
        </button>
      </div>
    </header>
    
    <!-- Selector de rango de fechas -->
    <div class="fecha-selector">
      <button 
        class="btn-navegacion" 
        @click="navegarTiempo('anterior')"
        :disabled="isLoading"
      >
        <span class="flecha">←</span>
      </button>
      
      <div class="preset-buttons">
        <button 
          class="btn-fecha" 
          :class="{ 'btn-fecha-activo': rangoSeleccionado === '7d' }"
          @click="actualizarRangoFechas('7d', diasDesplazamiento)"
        >
          7 días
        </button>
        <button 
          class="btn-fecha" 
          :class="{ 'btn-fecha-activo': rangoSeleccionado === '30d' }"
          @click="actualizarRangoFechas('30d', diasDesplazamiento)"
        >
          30 días
        </button>
        <button 
          class="btn-fecha" 
          :class="{ 'btn-fecha-activo': rangoSeleccionado === '90d' }"
          @click="actualizarRangoFechas('90d', diasDesplazamiento)"
        >
          90 días
        </button>
      </div>
      
      <button 
        class="btn-navegacion" 
        @click="navegarTiempo('siguiente')"
        :disabled="isLoading || diasDesplazamiento >= 0"
      >
        <span class="flecha">→</span>
      </button>
  
    </div>

    <p class="horquilla-fechas" v-if="fechaInicio > 0 && fechaFin > 0">
      Desde: {{ formatDate(fechaInicio) }} - Hasta: {{ formatDate(fechaFin) }}
    </p>
    
    
    
    <div v-if="isLoading" class="loading">
      <p>Cargando entrenos...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadEntrenos" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="entrenos.length === 0" class="no-entrenos">
      <p class="no-entrenos-text">
        No tienes entrenos en el período seleccionado.
      </p>
      <button @click="crearNuevoEntreno" class="btn btn-primary btn-lg">Crear tu primer entreno</button>
    </div>
    
    <div v-else>
      <!-- Gráfica de carga de entrenamiento -->
      <div class="chart-container">
        <h2>Carga de entrenamiento</h2>
        <div class="chart">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>
      
      <div class="entrenos-list">
        <div 
          v-for="entreno in entrenosOrdenados" 
          :key="entreno.EntrenoId" 
          class="entreno-card"
          @click="verDetalleEntreno(entreno.EntrenoId)"
        >
          <div class="entreno-info">
            <h3>{{ entreno.Nom }}</h3>
            <p class="date">{{ formatDate(entreno.Data) }}</p>
            <p class="carga">Carga total: <strong>{{ entreno.CargaTotal }} kg</strong></p>
          </div>
          <div class="entreno-actions">
            <button class="btn btn-secondary">Ver detalles</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entrenos-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  padding-bottom: 80px; /* Espacio para el footer */
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

.header h1 {
  margin-bottom: 0;
}

/* Estilos para la gráfica */
.chart-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border);
}

.chart-container h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.chart {
  height: 250px;
  position: relative;
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

.loading, .error, .no-entrenos {
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
  border: 1px solid var(--color-cobalt-blue);
  color: var(--color-cobalt-blue);
}

.btn-secondary:hover {
  background-color: rgba(25, 86, 200, 0.1);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.no-entrenos {
  text-align: center;
  padding: 3rem 2rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
  margin: 1.5rem 0;
}

.no-entrenos-text {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  color: var(--text-secondary);
}

.btn-lg {
  padding: 0.75rem 2rem;
  font-size: 1.1rem;
}

/* Estilos para el selector de fechas */
.fecha-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-navegacion {
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.btn-navegacion:hover:not(:disabled) {
  color: var(--color-cobalt-blue);
}

.btn-navegacion:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.flecha {
  font-size: 1.5rem;
  line-height: 1;
}
.btn-fecha {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}
.btn-fecha:hover {
  background-color: var(--bg-primary);
}
.btn-fecha-activo {
  background-color: var(--color-cobalt-blue);
  color: white;
  border-color: var(--color-cobalt-blue);
}
.btn-fecha-activo:hover {
  background-color: #1648a0;
}

.horquilla-fechas {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
  font-style: italic;
}
</style>
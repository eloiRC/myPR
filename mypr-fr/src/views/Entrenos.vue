<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import authService from '../services/auth';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Definir la interfaz para un entreno
interface Entreno {
  EntrenoId: number;
  UserId: number;
  Data: number; // Timestamp en segundos
  CargaTotal: number;
}

const router = useRouter();
const entrenos = ref<Entreno[]>([]);
const isLoading = ref(true);
const error = ref('');

// Ordenar entrenos por fecha (más recientes primero)
const entrenosOrdenados = computed(() => {
  return [...entrenos.value].sort((a, b) => b.Data - a.Data);
});

// Datos para la gráfica de carga de entrenamiento
const chartData = computed(() => {
  // Crear un mapa para agrupar entrenos por día
  const entrenosPorDia = new Map<string, number>();
  
  // Obtener fecha actual y calcular los últimos 7 días
  const hoy = new Date();
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - (6 - i)); // Ordenar de más antiguo a más reciente
    return fecha;
  });
  
  // Inicializar el mapa con los últimos 7 días y carga 0
  ultimos7Dias.forEach(fecha => {
    const fechaStr = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    entrenosPorDia.set(fechaStr, 0);
  });
  
  // Sumar la carga de cada entreno al día correspondiente
  entrenos.value.forEach(entreno => {
    const fecha = new Date(entreno.Data * 1000);
    const fechaStr = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    
    // Si la fecha está dentro de los últimos 7 días, actualizar la carga
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
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Cargar los entrenos de los últimos 7 días
const loadEntrenos = async () => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    
    // Calcular fechas para los últimos 7 días
    const now = Math.floor(Date.now() / 1000); // Timestamp actual en segundos
    // Asegurarnos de que las fechas cumplan con los requisitos del esquema
    const minDate = 1735693300; // Valor mínimo aceptado por el esquema
    const sevenDaysAgo = Math.max(now - (7 * 24 * 60 * 60), minDate); // 7 días atrás en segundos
    
    // Obtener el token de autenticación
    const token = authService.getToken();
    console.log('Token:', token);
    
    // Preparar los datos para la solicitud
    const requestData = {
      token,
      dataInici: sevenDaysAgo,
      dataFi: now
    };
    console.log('Datos de la solicitud:', requestData);
    
    // Hacer la solicitud a la API
    const response = await fetch('http://localhost:8787/api/getEntrenos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('Respuesta del servidor:', response);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error del servidor:', errorText);
      throw new Error(`Error al cargar los entrenos: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Datos recibidos:', data);
    
    // Asegurarnos de que los datos recibidos sean un array
    if (Array.isArray(data)) {
      entrenos.value = data;
    } else if (data && typeof data === 'object') {
      // Si es un objeto, intentar extraer los resultados
      entrenos.value = data.results || [];
    } else {
      entrenos.value = [];
      console.error('Formato de datos inesperado:', data);
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
    const response = await fetch('http://localhost:8787/api/nouEntreno', {
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

// Cargar los entrenos al montar el componente
onMounted(loadEntrenos);
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
    
    <div v-if="isLoading" class="loading">
      <p>Cargando entrenos...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadEntrenos" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="entrenos.length === 0" class="no-entrenos">
      <p>No tienes entrenos en los últimos 7 días.</p>
      <button @click="crearNuevoEntreno" class="btn btn-primary">Crear tu primer entreno</button>
    </div>
    
    <div v-else>
      <!-- Gráfica de carga de entrenamiento -->
      <div class="chart-container">
        <h2>Carga de entrenamiento (últimos 7 días)</h2>
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
            <h3>Entreno #{{ entreno.EntrenoId }}</h3>
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
</style> 
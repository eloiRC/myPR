<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Usa la variable de entorno o el valor por defecto

const authStore = useAuthStore();

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
const rangoSeleccionado = ref<'7d' | '30d' | '90d'>('30d');
const diasDesplazamiento = ref<number>(0);

// Ordenar entrenos por fecha (más recientes primero)
const entrenosOrdenados = computed(() => {
  return [...entrenos.value].sort((a, b) => b.Data - a.Data);
});

// Datos para la gráfica de carga de entrenamiento
const chartData = computed(() => {
  // Crear un mapa para agrupar entrenos por día
  const entrenosPorDia = new Map<string, number>();
  
  let entenosAMostrar = entrenos.value.length
  
  // Calcular las fechas para mostrar
  const fechas = Array.from({ length: entenosAMostrar }, (_, i) => {
    const fecha = new Date(entrenos.value[i].Data*1000);
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
        label: 'Peso total: (Tn)',
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

// Opciones para la gráfica
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Peso (Tn)'
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
  let dias = 30; // Por defecto 30 días
  
  switch (preset) {
    case '7d':
      dias = 7;
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
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    
    // Obtener el token de autenticación
    const token = authStore.token;
    
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
      for (let i = 0; i < entrenos.value.length; i++) {
        entrenos.value[i].CargaTotal = parseFloat((entrenos.value[i].CargaTotal / 1000).toFixed(2));
      }
    } else if (data && typeof data === 'object') {
      entrenos.value = data.results || [];
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

// Navegar a la página de ejercicios
const irAEjercicios = () => {
  router.push('/ejercicios');
};

// Crear un nuevo entreno
const crearNuevoEntreno = async () => {
  try {
    isLoading.value = true;
    
    // Obtener el token de autenticación
    const token = authStore.token;
    
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

// Eliminar un entreno completo (con confirmación)
const eliminarEntreno = async (entrenoId: number) => {
  if (!confirm('¿Estás seguro de eliminar este entreno? Se borrarán todas sus series.')) return;
  try {
    isLoading.value = true;
    const token = authStore.token;
    const response = await fetch(API_URL + '/api/deleteEntreno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, entrenoId })
    });
    if (!response.ok) {
      throw new Error('Error al eliminar entreno');
    }
    // Eliminar de la lista local sin recargar
    entrenos.value = entrenos.value.filter(e => e.EntrenoId !== entrenoId);
  } catch (err: any) {
    error.value = err.message || 'Error al eliminar entreno';
    console.error('Error al eliminar entreno:', err);
  } finally {
    isLoading.value = false;
  }
}

// Inicializar el rango de fechas al montar el componente
onMounted(() => {
  actualizarRangoFechas('30d');
});
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1>Mis entrenos</h1>
      <div class="page-header-actions">
        <button @click="irAEjercicios" class="btn btn-secondary" :disabled="isLoading">
          Mis Ejercicios
        </button>
        <button @click="crearNuevoEntreno" class="btn btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Cargando...' : 'Nuevo Entreno' }}
        </button>
      </div>
    </header>
    
    <div class="segment">
      <button type="button" class="segment-nav" @click="navegarTiempo('anterior')" :disabled="isLoading" aria-label="Anterior">←</button>
      <button type="button" class="segment-btn" :class="{ active: rangoSeleccionado === '7d' }" @click="actualizarRangoFechas('7d', diasDesplazamiento)">7 días</button>
      <button type="button" class="segment-btn" :class="{ active: rangoSeleccionado === '30d' }" @click="actualizarRangoFechas('30d', diasDesplazamiento)">30 días</button>
      <button type="button" class="segment-btn" :class="{ active: rangoSeleccionado === '90d' }" @click="actualizarRangoFechas('90d', diasDesplazamiento)">90 días</button>
      <button type="button" class="segment-nav" @click="navegarTiempo('siguiente')" :disabled="isLoading || diasDesplazamiento >= 0" aria-label="Siguiente">→</button>
    </div>

    <p class="caption" v-if="fechaInicio > 0 && fechaFin > 0">
      Desde: {{ formatDate(fechaInicio) }} - Hasta: {{ formatDate(fechaFin) }}
    </p>
    
    
    
    <div v-if="isLoading" class="state-box">
      <p>Cargando entrenos...</p>
    </div>
    
    <div v-else-if="error" class="state-box error">
      <p>{{ error }}</p>
      <button @click="loadEntrenos" class="btn">Reintentar</button>
    </div>
    
    <div v-else-if="entrenos.length === 0" class="state-box">
      <p class="no-entrenos-text">
        No tienes entrenos en el período seleccionado.
      </p>
      <button @click="crearNuevoEntreno" class="btn btn-primary btn-lg">Crear tu primer entreno</button>
    </div>
    
    <div v-else>
      <!-- Gráfica de carga de entrenamiento -->
      <div class="chart-panel">
        <h2>Carga de entrenamiento</h2>
        <div class="chart-wrap">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>
      
      <div class="entrenos-list">
        <div 
          v-for="entreno in entrenosOrdenados" 
          :key="entreno.EntrenoId" 
          class="list-card"
          @click="verDetalleEntreno(entreno.EntrenoId)"
        >
          <div class="list-card-body">
            <h3>{{ entreno.Nom }}</h3>
            <p class="list-card-meta">{{ formatDate(entreno.Data) }}</p>
            <p class="carga">Peso total: <strong class="list-card-highlight">{{ entreno.CargaTotal }} Tn</strong></p>
          </div>
          <div class="entreno-actions">
            <button class="btn btn-danger" @click.stop="eliminarEntreno(entreno.EntrenoId)" :disabled="isLoading">Eliminar</button>
          </div>
          
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entreno-actions {
  flex-shrink: 0;
}

.carga {
  font-size: 0.9rem;
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
}
</style>

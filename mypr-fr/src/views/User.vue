<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import authService from '../services/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const router = useRouter();

const isLoading = ref(false);
const error = ref('');
const userInfo = ref(authService.getUserInfo());
const chatbotPrompt = ref('');
const isSavingPrompt = ref(false);

// Cargar prompt del usuario
const loadUserPrompt = async () => {
  try {
    const token = authService.getToken();
    const response = await fetch(API_URL + '/api/getUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (response.ok) {
      const data = await response.json();
      chatbotPrompt.value = data.ChatbotPrompt || '';
    }
  } catch (err) {
    console.error('Error loading user prompt', err);
  }
};

// Guardar prompt del usuario
const saveChatbotPrompt = async () => {
  try {
    isSavingPrompt.value = true;
    const token = authService.getToken();
    const response = await fetch(API_URL + '/api/updateUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatbotPrompt: chatbotPrompt.value })
    });
    
    if (!response.ok) throw new Error('Error saving prompt');
    
    alert('Preferencias del chatbot guardadas correctamente');
  } catch (err) {
    console.error('Error saving prompt', err);
    alert('Error al guardar las preferencias');
  } finally {
    isSavingPrompt.value = false;
  }
};

// Descargar historial completo de entrenos
const descargarHistorial = async () => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    error.value = '';
    
    // Obtener el token de autenticación
    const token = authService.getToken();
    
    // Hacer la solicitud a la API
    const response = await fetch(API_URL+'/api/downloadHistorial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      throw new Error('Error al descargar el historial');
    }
    
    const data = await response.json();
    
    // Convertir los datos a formato JSON con formato legible
    const jsonContent = JSON.stringify(data, null, 2);
    
    // Crear un blob con el contenido
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    // Crear un enlace temporal para descargar
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nombre del archivo con fecha actual
    const fecha = new Date().toISOString().split('T')[0];
    link.download = `historial_entrenos_${fecha}.json`;
    
    // Añadir al DOM, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar el objeto URL
    window.URL.revokeObjectURL(url);
    
  } catch (err: any) {
    error.value = err.message || 'Error al descargar el historial';
    console.error('Error al descargar historial:', err);
    alert('Error al descargar el historial. Por favor, intenta de nuevo.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (!authService.isAuthenticated()) {
    router.push('/login');
  }
  userInfo.value = authService.getUserInfo();
  loadUserPrompt();
});
</script>

<template>
  <div class="user-container">
    <header class="header">
      <h1>Mi Perfil</h1>
    </header>

    <div class="user-content">
      <div class="user-info-card">
        <h2>Información del Usuario</h2>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value">{{ userInfo?.email || 'No disponible' }}</span>
        </div>
        <div class="info-row">
          <span class="label">ID de Usuario:</span>
          <span class="value">{{ userInfo?.UserId || 'No disponible' }}</span>
        </div>
      </div>

      <div class="actions-card">
        <h2>Acciones</h2>
        <button 
          @click="descargarHistorial" 
          class="btn btn-primary btn-download" 
          :disabled="isLoading"
        >
          <span v-if="isLoading">Descargando...</span>
          <span v-else>📥 Descargar Historial Completo de Entrenos</span>
        </button>
        
        <p class="description">
          Descarga un archivo JSON con todo tu historial de entrenos, incluyendo todas las series y ejercicios realizados.
        </p>
       
      </div>

      <div class="actions-card">
        <h2>Personalización del Chatbot</h2>
        <p class="description" style="margin-bottom: 1rem;">
          Define instrucciones específicas para tu entrenador AI (ej: "Tengo una lesión en la espalda", "Quiero priorizar fuerza", "Soy principiante").
        </p>
        <textarea 
          v-model="chatbotPrompt" 
          class="prompt-input" 
          placeholder="Escribe aquí tus objetivos, limitaciones o preferencias..."
          rows="4"
        ></textarea>
        <button 
          @click="saveChatbotPrompt" 
          class="btn btn-primary btn-save" 
          :disabled="isSavingPrompt"
        >
          <span v-if="isSavingPrompt">Guardando...</span>
          <span v-else>💾 Guardar Preferencias</span>
        </button>
      </div>

      <div v-if="error" class="error-message">
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
  padding-bottom: 100px;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0;
  font-size: 2rem;
}

.user-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.user-info-card,
.actions-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.user-info-card h2,
.actions-card h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: var(--text-secondary);
}

.value {
  font-weight: 600;
  color: var(--text-primary);
}

.btn-download {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.error-message {
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #dc3545;
}

@media (max-width: 600px) {
  .user-container {
    padding: 1rem 0.5rem;
  }

  .user-info-card,
  .actions-card {
    padding: 1rem;
  }

  .header h1 {
    font-size: 1.5rem;
  }
  .header h1 {
    font-size: 1.5rem;
  }
}

.prompt-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  resize: vertical;
  margin-bottom: 1rem;
}

.btn-save {
  width: 100%;
  padding: 0.75rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}
</style>



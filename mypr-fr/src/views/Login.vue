<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import authService from '../services/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor, completa todos los campos';
    return;
  }

  try {
    isLoading.value = true;
    
    // Usar el servicio de autenticación para iniciar sesión
    await authService.login({
      email: email.value,
      password: password.value
    });
    
    // Redirigir a la página de entrenos después del login exitoso
    router.push('/entrenos');
  } catch (error: any) {
    errorMessage.value = error.message || 'Error al iniciar sesión. Inténtalo de nuevo.';
    console.error('Error de login:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="card login-card">
      <h1 class="text-center">Iniciar Sesión</h1>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-control">
          <label for="email">Correo Electrónico</label>
          <input 
            id="email" 
            type="email" 
            v-model="email" 
            class="input" 
            placeholder="tu@email.com"
            required
          />
        </div>
        
        <div class="form-control">
          <label for="password">Contraseña</label>
          <input 
            id="password" 
            type="password" 
            v-model="password" 
            class="input" 
            placeholder="Tu contraseña"
            required
          />
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary login-button" 
          :disabled="isLoading"
        >
          {{ isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
}

.login-form {
  margin-top: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.login-button {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  font-size: 1rem;
}

.error-message {
  color: var(--error);
  margin: 0.5rem 0;
  font-size: 0.875rem;
}
</style> 
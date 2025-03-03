<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import authService from '../services/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const validateForm = () => {
  if (!email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Por favor, completa todos los campos';
    return false;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden';
    return false;
  }

  if (password.value.length < 8) {
    errorMessage.value = 'La contraseña debe tener al menos 8 caracteres';
    return false;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password.value)) {
    errorMessage.value = 'La contraseña debe contener al menos una letra y un número';
    return false;
  }

  return true;
};

const handleRegister = async () => {
  if (!validateForm()) return;

  try {
    isLoading.value = true;
    await authService.register({
      email: email.value,
      password: password.value
    });
    
    // Redirigir a la página de login después del registro exitoso
    router.push('/login');
  } catch (error: any) {
    errorMessage.value = error.message || 'Error al registrar usuario. Inténtalo de nuevo.';
    console.error('Error de registro:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="card register-card">
      <h1 class="text-center">Registro de Usuario</h1>
      
      <form @submit.prevent="handleRegister" class="register-form">
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

        <div class="form-control">
          <label for="confirmPassword">Confirmar Contraseña</label>
          <input 
            id="confirmPassword" 
            type="password" 
            v-model="confirmPassword" 
            class="input" 
            placeholder="Confirma tu contraseña"
            required
          />
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary register-button" 
          :disabled="isLoading"
        >
          {{ isLoading ? 'Registrando...' : 'Registrarse' }}
        </button>

        <div class="text-center mt-4">
          <router-link to="/login" class="text-primary hover:underline">
            ¿Ya tienes una cuenta? Inicia sesión
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-card {
  width: 100%;
  max-width: 400px;
}

.register-form {
  margin-top: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.register-button {
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
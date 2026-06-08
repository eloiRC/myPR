<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

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
    await authStore.register({
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
  <div class="auth-page">
    <div class="card auth-card">
      <div class="auth-brand">
        <span class="auth-logo">MyPR</span>
        <h1>Crear cuenta</h1>
        <p class="auth-subtitle">Empieza a registrar tus entrenamientos hoy</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
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
        
        <div class="form-group">
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

        <div class="form-group">
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
        
        <button type="submit" class="btn btn-primary auth-submit" :disabled="isLoading">
          {{ isLoading ? 'Registrando...' : 'Registrarse' }}
        </button>

        <router-link to="/login" class="auth-link">
          ¿Ya tienes cuenta? Inicia sesión
        </router-link>
      </form>
    </div>
  </div>
</template>
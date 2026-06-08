<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

if (authStore.isAuthenticated) {
  router.push('/entrenos');
}

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor, completa todos los campos';
    return;
  }

  try {
    isLoading.value = true;
    await authStore.login({
      email: email.value,
      password: password.value
    });
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
  <div class="auth-page">
    <div class="card auth-card">
      <div class="auth-brand">
        <span class="auth-logo">MyPR</span>
        <h1>Iniciar sesión</h1>
        <p class="auth-subtitle">Registra tus entrenos y supera tus marcas</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            v-model="email"
            class="input"
            placeholder="tu@email.com"
            required
            autocomplete="email"
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
            autocomplete="current-password"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="btn btn-primary auth-submit" :disabled="isLoading">
          {{ isLoading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
        </button>

        <router-link to="/register" class="auth-link">
          ¿No tienes cuenta? Regístrate
        </router-link>
      </form>
    </div>
  </div>
</template>


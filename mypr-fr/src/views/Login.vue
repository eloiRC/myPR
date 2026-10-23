<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AuthShell from '../components/perfil/AuthShell.vue';

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
  <AuthShell titulo="Iniciar sesión" subtitulo="Registra tus entrenos y supera tus marcas">
    <form @submit.prevent="handleLogin" class="au-form">
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
          :aria-invalid="errorMessage ? 'true' : undefined"
          :aria-describedby="errorMessage ? 'auth-error' : undefined"
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
          :aria-invalid="errorMessage ? 'true' : undefined"
          :aria-describedby="errorMessage ? 'auth-error' : undefined"
        />
      </div>

      <p v-if="errorMessage" id="auth-error" class="au-error" role="alert">{{ errorMessage }}</p>

      <button type="submit" class="btn btn-primary au-submit" :disabled="isLoading">
        {{ isLoading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
      </button>

      <router-link to="/register" class="au-link">¿No tienes cuenta?<strong>Regístrate</strong></router-link>
    </form>
  </AuthShell>
</template>

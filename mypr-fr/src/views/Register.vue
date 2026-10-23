<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AuthShell from '../components/perfil/AuthShell.vue';

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

  if (!/[A-Za-z]/.test(password.value)) {
    errorMessage.value = 'La contraseña debe contener al menos una letra';
    return false;
  }

  if (!/\d/.test(password.value)) {
    errorMessage.value = 'La contraseña debe contener al menos un número';
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
  <AuthShell titulo="Crear cuenta" subtitulo="Empieza a registrar tus entrenamientos hoy">
    <form @submit.prevent="handleRegister" class="au-form">
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
          placeholder="Mínimo 8 caracteres, letra y número"
          required
          autocomplete="new-password"
          :aria-invalid="errorMessage ? 'true' : undefined"
          :aria-describedby="errorMessage ? 'auth-error' : undefined"
        />
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirmar contraseña</label>
        <input
          id="confirmPassword"
          type="password"
          v-model="confirmPassword"
          class="input"
          placeholder="Repite tu contraseña"
          required
          autocomplete="new-password"
          :aria-invalid="errorMessage ? 'true' : undefined"
          :aria-describedby="errorMessage ? 'auth-error' : undefined"
        />
      </div>

      <p v-if="errorMessage" id="auth-error" class="au-error" role="alert">{{ errorMessage }}</p>

      <button type="submit" class="btn btn-primary au-submit" :disabled="isLoading">
        {{ isLoading ? 'Registrando...' : 'Registrarse' }}
      </button>

      <router-link to="/login" class="au-link">¿Ya tienes cuenta?<strong>Inicia sesión</strong></router-link>
    </form>
  </AuthShell>
</template>

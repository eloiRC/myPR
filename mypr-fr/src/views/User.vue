<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Download, LogOut } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { apiFetch } from '../services/api';
import TemporizadorDescanso from '../components/perfil/TemporizadorDescanso.vue';
import MemoriaEntrenador from '../components/perfil/MemoriaEntrenador.vue';

const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(false);
const error = ref('');
const userInfo = ref(authStore.userInfo);
const email = computed(() => userInfo.value?.email || 'No disponible');
const inicial = computed(() => (userInfo.value?.email?.trim()[0] || '?').toUpperCase());

const cerrarSesion = () => {
  authStore.logout();
  router.push('/login');
};

// Descargar historial completo de entrenos
const descargarHistorial = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }

  try {
    isLoading.value = true;
    error.value = '';

    const data = await apiFetch<any[]>('/api/downloadHistorial', {});
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fecha = new Date().toISOString().split('T')[0];
    link.download = `historial_entrenos_${fecha}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    error.value = err.message || 'Error al descargar el historial';
    console.error('Error al descargar historial:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
  }
  userInfo.value = authStore.userInfo;
});
</script>

<template>
  <div class="page perfil">
    <h1 class="sr-only">Mi perfil</h1>

    <section class="panel cuenta" aria-label="Cuenta">
      <div class="cuenta-mono" aria-hidden="true">{{ inicial }}</div>
      <div class="cuenta-datos">
        <span class="cuenta-rotulo">Cuenta</span>
        <span class="cuenta-email">{{ email }}</span>
      </div>
      <button type="button" class="cuenta-salir" @click="cerrarSesion">
        <LogOut :size="18" :stroke-width="2" aria-hidden="true" />
        <span>Cerrar sesión</span>
      </button>
    </section>

    <TemporizadorDescanso />

    <MemoriaEntrenador />

    <section class="panel" aria-labelledby="datos-h">
      <h2 id="datos-h" class="panel-title">Datos</h2>
      <p class="datos-desc">
        Un archivo JSON con todo tu historial: entrenos, ejercicios y series.
      </p>
      <button type="button" class="btn btn-secondary datos-btn" :disabled="isLoading"
        :aria-describedby="error ? 'datos-error' : undefined" @click="descargarHistorial">
        <Download :size="18" :stroke-width="2.25" aria-hidden="true" />
        {{ isLoading ? 'Descargando...' : 'Descargar historial' }}
      </button>
      <p v-if="error" id="datos-error" class="datos-error" role="alert">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.perfil { padding-top: 1rem; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
.panel-title {
  margin: 0 0 0.5rem; font-family: var(--font-display); font-size: 0.85rem; font-weight: 700;
  color: var(--n6); text-transform: uppercase; letter-spacing: 0.12em;
}

.cuenta { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 0.875rem; align-items: center; }
.cuenta-mono {
  grid-row: span 2; display: grid; place-items: center; width: 3.25rem; height: 3.25rem;
  background: var(--n0); border: 1px solid var(--n4); border-radius: var(--radius-md);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5); color: var(--n8);
  font-family: var(--font-display); font-size: 2rem; font-weight: 700; line-height: 1;
}
.cuenta-datos { display: flex; flex-direction: column; min-width: 0; }
.cuenta-rotulo { font-family: var(--font-display); font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--n6); }
.cuenta-email {
  font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; letter-spacing: 0.04em;
  color: var(--n8); overflow-wrap: anywhere; line-height: 1.15;
}
.cuenta-salir {
  grid-column: 2; justify-self: start; display: inline-flex; align-items: center; gap: 0.4rem;
  min-height: var(--touch-min); padding: 0 0.5rem; margin-left: -0.5rem;
  background: none; border: 0; border-radius: var(--radius-sm); cursor: pointer; color: var(--n7);
  font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
}
.cuenta-salir:hover { color: var(--led-red); background: var(--led-red-dim); }

.datos-desc { margin: 0 0 0.75rem; font-size: 0.875rem; color: var(--n7); }
.datos-btn { width: 100%; }
.datos-error { margin: 0.75rem 0 0; font-size: 0.875rem; color: var(--led-red); }

@media (min-width: 768px) {
  .datos-btn { width: auto; }
}
</style>

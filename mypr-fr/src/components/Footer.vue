<script setup lang="ts">
import { useRouter } from 'vue-router';
import authService from '../services/auth';
import { computed } from 'vue';

const router = useRouter();
const userInfo = computed(() => authService.getUserInfo());

const cerrarSesion = () => {
  authService.logout();
  router.push('/login');
};

const irAPerfil = () => {
  router.push('/user');
};
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer-inner">
      <button
        v-if="userInfo"
        type="button"
        class="footer-profile"
        @click="irAPerfil"
        title="Ver mi perfil"
      >
        <span class="footer-avatar">{{ userInfo.email?.charAt(0).toUpperCase() }}</span>
        <span class="footer-email">{{ userInfo.email }}</span>
      </button>
      <button type="button" @click="cerrarSesion" class="btn btn-secondary btn-sm footer-logout">
        Cerrar sesión
      </button>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  flex-shrink: 0;
  margin-top: 2rem;
  padding: 1.25rem var(--space-page-x);
  padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}

.app-footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: var(--max-content);
  margin: 0 auto;
}

.footer-profile {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  min-width: 0;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.footer-profile:hover {
  background: var(--bg-tertiary);
}

.footer-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: #042f2e;
  font-size: 0.875rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.footer-email {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-profile:hover .footer-email {
  color: var(--text-primary);
}

.footer-logout {
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .app-footer-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .footer-logout {
    width: 100%;
  }
}
</style>

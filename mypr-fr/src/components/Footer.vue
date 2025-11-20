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
  <footer class="footer">
    <div class="footer-content">
      <div class="user-info" v-if="userInfo">
        <span class="email clickable" @click="irAPerfil" title="Ver mi perfil">{{ userInfo.email }}</span>
      </div>
      <button @click="cerrarSesion" class="btn-logout">
        <span class="icon">⟲</span> Cerrar Sesión
      </button>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border);
  padding: 0.75rem 1rem;
  z-index: 10;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 800px;
  margin: 0 auto;
}

.user-info {
  display: flex;
  align-items: center;
}

.email {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.email.clickable {
  cursor: pointer;
  transition: color 0.2s ease;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: all 0.2s ease;
}

.email.clickable:hover {
  color: var(--color-sandy-brown);
  text-decoration-color: var(--color-sandy-brown);
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background-color: var(--color-sandy-brown);
  color: white;
  border-color: var(--color-sandy-brown);
}

.icon {
  font-size: 1.1rem;
}

@media (max-width: 600px) {
  .footer-content {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .user-info {
    margin-bottom: 0.5rem;
  }
}
</style> 
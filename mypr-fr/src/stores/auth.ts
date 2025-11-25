import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface UserInfo {
    email: string;
    UserId: number;
}

export const useAuthStore = defineStore('auth', () => {
    // Estado (State)
    const token = ref<string | null>(localStorage.getItem('token'));
    const userId = ref<string | null>(localStorage.getItem('userId'));

    // Getters (Computed)
    const isAuthenticated = computed(() => {
        if (!token.value) return false;
        const exp = localStorage.getItem('exp');
        if (exp && parseInt(exp) < (Math.floor(Date.now() / 1000))) {
            return false;
        }
        return true;
    });

    const userInfo = computed<UserInfo | null>(() => {
        if (!token.value) return null;
        try {
            const tokenParts = token.value.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                return {
                    email: payload.email,
                    UserId: payload.UserId
                };
            }
            return null;
        } catch (error) {
            console.error('Error decodificando token:', error);
            return null;
        }
    });

    // Acciones (Actions)
    function setToken(newToken: string) {
        token.value = newToken;
        localStorage.setItem('token', newToken);

        // Decodificar y guardar datos extra si es necesario
        try {
            const tokenParts = newToken.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                if (payload.UserId) {
                    userId.value = payload.UserId.toString();
                    localStorage.setItem('userId', payload.UserId.toString());
                }
                if (payload.exp) {
                    localStorage.setItem('exp', payload.exp);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    function logout() {
        token.value = null;
        userId.value = null;
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('exp');
    }

    async function login(credentials: { email: string, password: string }) {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            const errorText = await response.text();
            // Intentar parsear como JSON, si falla usar texto plano
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.message || 'Error al iniciar sesión');
            } catch {
                throw new Error(errorText || 'Error al iniciar sesión');
            }
        }

        const data = await response.json();
        setToken(data.token);
        return data;
    }

    async function register(credentials: { email: string, password: string }) {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return await response.json();
    }

    return {
        token,
        userId,
        isAuthenticated,
        userInfo,
        login,
        logout,
        register
    };
});
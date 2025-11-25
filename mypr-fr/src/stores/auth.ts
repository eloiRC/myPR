import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const useAuthStore = defineStore('auth', () => {


    // Estado (inicializado desde localStorage para persistencia al recargar)
    const token = ref<string | null>(localStorage.getItem('token'));
    const userId = ref<string | null>(localStorage.getItem('userId'));

    // Getters
    const isAuthenticated = computed(() => {
        if (!token.value) return false;
        const exp = localStorage.getItem('exp');
        if (!exp) return false;
        return parseInt(exp) > Math.floor(Date.now() / 1000);
    });

    const userInfo = computed(() => {
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
            return null;
        }
    });

    // Acciones internas
    function setSession(newToken: string) {
        token.value = newToken;
        localStorage.setItem('token', newToken);

        try {
            const tokenParts = newToken.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));

                if (payload.UserId) {
                    userId.value = payload.UserId.toString();
                    localStorage.setItem('userId', payload.UserId.toString());
                }
                if (payload.exp) {
                    localStorage.setItem('exp', payload.exp.toString());
                }
            }
        } catch (e) {
            console.error('Error parsing token', e);
        }
    }

    // Acciones públicas
    function logout() {
        token.value = null;
        userId.value = null;
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('exp');
        // Opcional: router.push('/login');
    }

    async function login(data: { email: string, password: string }) {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al iniciar sesión');
        }

        const responseData = await response.json();
        setSession(responseData.token);
    }

    async function register(data: { email: string, password: string }) {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
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
        register,
        logout
    };
});
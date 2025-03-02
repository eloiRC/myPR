import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Entrenos from '../views/Entrenos.vue';
import DetalleEntreno from '../views/DetalleEntreno.vue';
import Ejercicios from '../views/Ejercicios.vue';
import authService from '../services/auth';

// Función para verificar si el usuario está autenticado
const requireAuth = (_to: any, _from: any, next: any) => {
    if (!authService.isAuthenticated()) {
        next('/login');
    } else {
        next();
    }
};

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: Login
        },
        {
            path: '/',
            name: 'home',
            redirect: '/entrenos'
        },
        {
            path: '/entrenos',
            name: 'entrenos',
            component: Entrenos,
            beforeEnter: requireAuth
        },
        {
            path: '/entreno/:id',
            name: 'detalleEntreno',
            component: DetalleEntreno,
            beforeEnter: requireAuth
        },
        {
            path: '/ejercicios',
            name: 'ejercicios',
            component: Ejercicios,
            beforeEnter: requireAuth
        }
    ]
});

export default router;

import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Entrenos from '../views/Entrenos.vue';
import DetalleEntreno from '../views/DetalleEntreno.vue';
import Ejercicios from '../views/Ejercicios.vue';
import DetalleEjercicio from '../views/DetalleEjercicio.vue';
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
            path: '/register',
            name: 'register',
            component: Register
        },
        {
            path: '/',
            name: 'home',
            redirect: '/entrenos',
            beforeEnter: requireAuth
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
        },
        {
            path: '/ejercicio/:id',
            name: 'detalleEjercicio',
            component: DetalleEjercicio,
            beforeEnter: requireAuth
        }
    ]
});

export default router;

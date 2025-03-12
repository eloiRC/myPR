// Definir la URL base de la API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Usa la variable de entorno o el valor por defecto

// Interfaz para la respuesta de login
interface LoginResponse {
    message: string;
    token: string;
}

// Interfaz para los datos de login
interface LoginData {
    email: string;
    password: string;
}

// Interfaz para los datos de registro
interface RegisterData {
    email: string;
    password: string;
}

// Interfaz para la respuesta de registro
interface RegisterResponse {
    message: string;
    token: string;
}

// Interfaz para la información del usuario
interface UserInfo {
    email: string;
    UserId: number;
}

/**
 * Servicio para manejar la autenticación
 */
export const authService = {
    /**
     * Iniciar sesión con email y contraseña
     */
    async login(data: LoginData): Promise<LoginResponse> {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                credentials: 'include', // Incluir cookies en la solicitud
            });
            console.log('Respuesta del servidor:', response);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error del servidor:', errorData);
                throw new Error(errorData.message || 'Error al iniciar sesión');
            }

            const responseData = await response.json();
            console.log('Datos de respuesta:', responseData);

            // Guardar el token en localStorage
            localStorage.setItem('token', responseData.token);

            // Decodificar el token para obtener el userId (el token es un JWT)
            const tokenParts = responseData.token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                if (payload.UserId) {
                    localStorage.setItem('userId', payload.UserId.toString());
                }
                if (payload.exp) {
                    localStorage.setItem('exp', payload.exp)
                }
            }

            return responseData;
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    },

    /**
     * Registrar un nuevo usuario
     */
    async register(data: RegisterData): Promise<RegisterResponse> {
        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            throw error;
        }
    },

    /**
     * Cerrar sesión
     */
    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
    },

    /**
     * Verificar si el usuario está autenticado
     */
    isAuthenticated(): boolean {
        if (!!localStorage.getItem('token')) {
            if (parseInt(localStorage.getItem('exp') || '0') < (Math.floor(Date.now() / 1000))) {
                return false
            }
            else {
                return true
            }
        }
        return false
    },

    /**
     * Obtener el token de autenticación
     */
    getToken(): string | null {
        return localStorage.getItem('token');
    },

    /**
     * Obtener el ID del usuario
     */
    getUserId(): number | null {
        const userId = localStorage.getItem('userId');
        return userId ? parseInt(userId, 10) : null;
    },

    /**
     * Obtener información del usuario desde el token
     */
    getUserInfo(): UserInfo | null {
        const token = this.getToken();
        if (!token) return null;

        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                return {
                    email: payload.email,
                    UserId: payload.UserId
                };
            }
            return null;
        } catch (error) {
            console.error('Error al decodificar el token:', error);
            return null;
        }
    }
};

export default authService; 
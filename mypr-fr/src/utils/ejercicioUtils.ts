import { apiFetch } from '../services/api';

// Función para formatear el texto (primera letra mayúscula, resto minúsculas)
export const formatearTexto = (texto: string): string => {
    if (!texto) return '';
    return texto
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
        .join(' ');
};

// Interfaz para el nuevo ejercicio
export interface NuevoEjercicio {
    Nom: string;
    gruposMusculares: number[];
}

// Función para guardar un nuevo ejercicio
export const guardarNuevoEjercicio = async (
    nuevoEjercicio: NuevoEjercicio,
    onSuccess: (ejercicioGuardado: any) => void,
    onError: (error: string) => void
): Promise<void> => {
    if (nuevoEjercicio.gruposMusculares.length === 0) {
        onError('Debes seleccionar al menos un grupo muscular');
        return;
    }

    if (nuevoEjercicio.gruposMusculares.length > 5) {
        onError('No puedes seleccionar más de 5 grupos musculares');
        return;
    }

    if (!nuevoEjercicio.Nom.trim()) {
        onError('El nombre del ejercicio no puede estar vacío');
        return;
    }

    try {
        const ejercicioGuardado = await apiFetch<{ exerciciId: number }>('/api/nouExercici', {
            nom: formatearTexto(nuevoEjercicio.Nom),
            grupsMusculars: nuevoEjercicio.gruposMusculares.filter(gm => gm !== null)
        });
        onSuccess(ejercicioGuardado.exerciciId);
    } catch (error) {
        console.error('Error al guardar el ejercicio:', error);
        onError('Error al guardar el ejercicio. Inténtalo de nuevo.');
    }
}; 
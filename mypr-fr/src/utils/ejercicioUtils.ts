import authService from '../services/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'; // Usa la variable de entorno o el valor por defecto

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

//todo verificar que el nombre del ejerccio no se duplica
// Función para guardar un nuevo ejercicio
export const guardarNuevoEjercicio = async (
    nuevoEjercicio: NuevoEjercicio,
    onSuccess: (ejercicioGuardado: any) => void,
    onError: (error: string) => void
): Promise<void> => {
    // Validar que haya al menos un grupo muscular seleccionado
    if (nuevoEjercicio.gruposMusculares.length === 0) {
        onError('Debes seleccionar al menos un grupo muscular');
        return;
    }

    // Validar que no haya más de 5 grupos musculares seleccionados
    if (nuevoEjercicio.gruposMusculares.length > 5) {
        onError('No puedes seleccionar más de 5 grupos musculares');
        return;
    }

    // Validar que el nombre no esté vacío
    if (!nuevoEjercicio.Nom.trim()) {
        onError('El nombre del ejercicio no puede estar vacío');
        return;
    }
    //podriam comprobar si ese nombre de ejercicio ya existe
    try {
        const token = authService.getToken();

        const response = await fetch(API_URL + '/api/nouExercici', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                nom: formatearTexto(nuevoEjercicio.Nom),
                grupsMusculars: nuevoEjercicio.gruposMusculares.filter(gm => gm !== null)
            })
        });

        if (!response.ok) {
            throw new Error('Error al guardar el ejercicio');
        }

        const ejercicioGuardado = await response.json();
        onSuccess(ejercicioGuardado.exerciciId);

    } catch (error) {
        console.error('Error al guardar el ejercicio:', error);
        onError('Error al guardar el ejercicio. Inténtalo de nuevo.');
    }
}; 
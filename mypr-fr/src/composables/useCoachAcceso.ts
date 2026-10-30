import { ref } from 'vue';
import { apiFetch } from '../services/api';

// ¿Tiene esta cuenta acceso al entrenador IA? Lo decide el servidor (getUser.CoachEnabled); se recuerda en el
// dispositivo para no parpadear al abrir y se vuelve a comprobar una vez por carga de la app.
const CLAVE = 'mypr_coach_acceso';

const leer = (): boolean => {
  try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; }
};

const habilitado = ref(leer());
let consultado = false;

export function useCoachAcceso() {
  if (!consultado) {
    consultado = true;
    apiFetch<{ CoachEnabled?: boolean }>('/api/getUser', {})
      .then((u) => {
        habilitado.value = !!u.CoachEnabled;
        try { localStorage.setItem(CLAVE, habilitado.value ? '1' : '0'); } catch { /* sin almacenamiento */ }
      })
      .catch(() => { consultado = false; });
  }
  return { coachHabilitado: habilitado };
}

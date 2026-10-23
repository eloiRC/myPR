import { ref, computed } from 'vue';
import { apiFetch } from '../services/api';

// ---------- Lógica pura (testeable, sin dependencias de Vue ni del DOM) ----------

export const PASO_AJUSTE_SEG = 15;
export const DURACIONES_PRESET = [60, 90, 120, 180];
export const DURACION_MIN_SEG = 15; // mismo rango que el servidor (15-900 s)
export const DURACION_MAX_SEG = 900;
export const DURACION_DEFECTO_SEG = 90;

export interface EstadoTemporizador {
  /** Duración total (ms), para calcular el progreso */
  totalMs: number;
  /** Marca de tiempo objetivo (Date.now) mientras corre; null si está en pausa */
  finMs: number | null;
  /** Tiempo restante congelado mientras está en pausa; null si corre */
  pausadoMs: number | null;
}

export const clampDuracionSeg = (seg: number): number => {
  if (!Number.isFinite(seg)) return DURACION_DEFECTO_SEG;
  return Math.min(DURACION_MAX_SEG, Math.max(DURACION_MIN_SEG, Math.round(seg)));
};

export const iniciarEstado = (segundos: number, now: number): EstadoTemporizador => {
  const totalMs = clampDuracionSeg(segundos) * 1000;
  return { totalMs, finMs: now + totalMs, pausadoMs: null };
};

/** Milisegundos restantes a partir del timestamp objetivo; nunca negativo */
export const restanteMs = (e: EstadoTemporizador, now: number): number => {
  if (e.pausadoMs !== null) return Math.max(0, e.pausadoMs);
  if (e.finMs === null) return 0;
  return Math.max(0, e.finMs - now);
};

export const estaPausado = (e: EstadoTemporizador): boolean => e.pausadoMs !== null;

export const pausarEstado = (e: EstadoTemporizador, now: number): EstadoTemporizador => {
  if (estaPausado(e)) return e;
  return { ...e, finMs: null, pausadoMs: restanteMs(e, now) };
};

export const reanudarEstado = (e: EstadoTemporizador, now: number): EstadoTemporizador => {
  if (!estaPausado(e)) return e;
  return { ...e, finMs: now + (e.pausadoMs as number), pausadoMs: null };
};

/** Suma (o resta) milisegundos al tiempo restante; se recorta en 0 */
export const ajustarEstado = (e: EstadoTemporizador, deltaMs: number, now: number): EstadoTemporizador => {
  const nuevo = Math.max(0, restanteMs(e, now) + deltaMs);
  const totalMs = Math.max(e.totalMs, nuevo);
  return estaPausado(e)
    ? { totalMs, finMs: null, pausadoMs: nuevo }
    : { totalMs, finMs: now + nuevo, pausadoMs: null };
};

/** Progreso 0..1 (0 = recién iniciado, 1 = terminado) */
export const progresoEstado = (e: EstadoTemporizador, now: number): number => {
  if (e.totalMs <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - restanteMs(e, now) / e.totalMs));
};

export const formatearMmSs = (ms: number): string => {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ---------- Resolución del descanso (jerarquía de 3 niveles) ----------

/** Un descanso válido en la BD/API: entero finito dentro del rango; cualquier otra cosa se ignora */
const descansoValido = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= DURACION_MIN_SEG && v <= DURACION_MAX_SEG;

/** Valor aceptable para el descanso de una serie o ejercicio: null (heredar), 0 (sin descanso) o 15-900 s */
export const descansoAceptable = (v: number | null): boolean => v === null || v === 0 || descansoValido(v);

/** Texto corto para mostrar un descanso fijado: 0 = sin descanso */
export const textoDescanso = (seg: number): string => (seg === 0 ? 'sin descanso' : formatearMmSs(seg * 1000));

/**
 * Descanso (s) a usar al marcar una serie como hecha:
 * 1) el propio de la serie, 2) el por defecto del ejercicio, 3) el global del usuario.
 * En serie y ejercicio: null/ausente = heredar del siguiente nivel; 0 = sin descanso.
 * Devuelve null cuando no hay que arrancar el temporizador.
 */
export const resolverDescanso = (
  serie: { DescansoSeg?: number | null } | null | undefined,
  ejercicio: { DescansoSeg?: number | null } | null | undefined,
  ajustes: { duracionSeg: number },
): number | null => {
  for (const nivel of [serie?.DescansoSeg, ejercicio?.DescansoSeg]) {
    if (nivel === 0) return null;
    if (descansoValido(nivel)) return nivel;
  }
  return clampDuracionSeg(ajustes.duracionSeg);
};

// ---------- Ajustes: servidor (fuente de verdad) + caché local ----------

export interface AjustesTemporizador {
  habilitado: boolean;
  duracionSeg: number;
  autoIniciar: boolean;
}

export const AJUSTES_DEFECTO: AjustesTemporizador = {
  habilitado: false,
  duracionSeg: DURACION_DEFECTO_SEG,
  autoIniciar: true,
};

/** Forma de /api/getUser y /api/updateRestTimer */
export interface AjustesServidor {
  RestTimerEnabled?: number | boolean | null;
  RestTimerDefaultSec?: number | null;
  RestTimerAutoStart?: number | boolean | null;
}

/** Cuerpo parcial de /api/updateRestTimer */
export interface CambioServidor {
  enabled?: boolean;
  defaultSec?: number;
  autoStart?: boolean;
}

export const desdeServidor = (u: AjustesServidor | null | undefined): AjustesTemporizador => ({
  habilitado: Boolean(u?.RestTimerEnabled),
  duracionSeg: clampDuracionSeg(Number(u?.RestTimerDefaultSec ?? DURACION_DEFECTO_SEG)),
  autoIniciar: u?.RestTimerAutoStart === undefined || u?.RestTimerAutoStart === null ? true : Boolean(u.RestTimerAutoStart),
});

export const haciaServidor = (a: AjustesTemporizador): Required<CambioServidor> => ({
  enabled: a.habilitado,
  defaultSec: clampDuracionSeg(a.duracionSeg),
  autoStart: a.autoIniciar,
});

export const sonDefecto = (a: AjustesTemporizador): boolean =>
  a.habilitado === AJUSTES_DEFECTO.habilitado
  && a.duracionSeg === AJUSTES_DEFECTO.duracionSeg
  && a.autoIniciar === AJUSTES_DEFECTO.autoIniciar;

/**
 * Migración única: si el servidor aún tiene los valores por defecto y este dispositivo
 * guardaba ajustes propios (distintos del defecto), se suben una sola vez.
 */
export const debeMigrarLocales = (
  servidor: AjustesTemporizador,
  local: AjustesTemporizador | null,
  yaMigrado: boolean,
): boolean => !yaMigrado && local !== null && sonDefecto(servidor) && !sonDefecto(local);

const CLAVE_AJUSTES = 'mypr_rest_timer_settings';
const CLAVE_MIGRADO = 'mypr_rest_timer_migrated';
const CLAVE_PENDIENTE = 'mypr_rest_timer_pending';

/** Lee la caché local; null si no hay nada guardado */
export const leerCache = (): AjustesTemporizador | null => {
  try {
    const raw = localStorage.getItem(CLAVE_AJUSTES);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      habilitado: p?.habilitado === true,
      duracionSeg: clampDuracionSeg(Number(p?.duracionSeg ?? DURACION_DEFECTO_SEG)),
      autoIniciar: p?.autoIniciar !== false,
    };
  } catch {
    return null;
  }
};

export const leerAjustes = (): AjustesTemporizador => leerCache() ?? { ...AJUSTES_DEFECTO };

const guardarCache = (a: AjustesTemporizador) => {
  try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(a)); } catch { /* sin almacenamiento: solo vale en esta sesión */ }
};

const leerPendiente = (): CambioServidor | null => {
  try {
    const raw = localStorage.getItem(CLAVE_PENDIENTE);
    return raw ? (JSON.parse(raw) as CambioServidor) : null;
  } catch {
    return null;
  }
};
const guardarPendiente = (c: CambioServidor | null) => {
  try {
    if (c && Object.keys(c).length) localStorage.setItem(CLAVE_PENDIENTE, JSON.stringify(c));
    else localStorage.removeItem(CLAVE_PENDIENTE);
  } catch { /* ignorado */ }
};
const marcarMigrado = () => { try { localStorage.setItem(CLAVE_MIGRADO, '1'); } catch { /* ignorado */ } };
const yaMigrado = () => { try { return localStorage.getItem(CLAVE_MIGRADO) === '1'; } catch { return false; } };

/** Dependencias de red inyectables (los tests usan versiones falsas) */
export interface DepsSync {
  leerUsuario: () => Promise<AjustesServidor>;
  guardar: (cambio: CambioServidor) => Promise<AjustesServidor>;
}

/**
 * Sincroniza al arrancar: empuja cambios pendientes (hechos sin conexión), migra los ajustes
 * locales antiguos una sola vez y, si no, adopta lo que diga el servidor.
 * Devuelve los ajustes que deben quedar activos.
 */
export const sincronizarAjustes = async (deps: DepsSync): Promise<AjustesTemporizador> => {
  const pendiente = leerPendiente();
  if (pendiente) {
    const r = await deps.guardar(pendiente);
    guardarPendiente(null);
    marcarMigrado();
    return desdeServidor(r);
  }
  const servidor = desdeServidor(await deps.leerUsuario());
  const local = leerCache();
  if (debeMigrarLocales(servidor, local, yaMigrado())) {
    const r = await deps.guardar(haciaServidor(local as AjustesTemporizador));
    marcarMigrado();
    return desdeServidor(r);
  }
  marcarMigrado();
  return servidor;
};

// ---------- Estado compartido ----------

const inicial = leerAjustes(); // arranque instantáneo / sin conexión
const habilitado = ref(inicial.habilitado);
const duracionSeg = ref(inicial.duracionSeg);
const autoIniciar = ref(inicial.autoIniciar);
/** Último error al hablar con el servidor (se muestra en Ajustes); '' = ninguno */
const errorGuardado = ref('');
const sincronizando = ref(false);

const aplicar = (a: AjustesTemporizador) => {
  habilitado.value = a.habilitado;
  duracionSeg.value = a.duracionSeg;
  autoIniciar.value = a.autoIniciar;
  if (!a.habilitado) estado.value = null;
  guardarCache(a);
};
const actuales = (): AjustesTemporizador => ({
  habilitado: habilitado.value, duracionSeg: duracionSeg.value, autoIniciar: autoIniciar.value,
});

// ---------- Estado compartido del temporizador en marcha ----------

/** null = no hay temporizador visible */
const estado = ref<EstadoTemporizador | null>(null);
/** Se incrementa en cada inicio/reinicio (distingue de los ajustes ±15 s) */
const ciclo = ref(0);

const depsReales: DepsSync = {
  leerUsuario: () => apiFetch<AjustesServidor>('/api/getUser', {}),
  guardar: (cambio) => apiFetch<AjustesServidor>('/api/updateRestTimer', cambio),
};

export function useRestTimer() {
  /** Guarda un cambio parcial: aplica ya (caché local) y lo envía al servidor */
  const guardarCambio = async (local: Partial<AjustesTemporizador>, cambio: CambioServidor) => {
    aplicar({ ...actuales(), ...local });
    errorGuardado.value = '';
    try {
      await depsReales.guardar(cambio);
      guardarPendiente(null);
      marcarMigrado();
    } catch (e: any) {
      // Sin conexión o error: el valor sigue activo en este dispositivo y se reintenta al sincronizar
      guardarPendiente({ ...(leerPendiente() ?? {}), ...cambio });
      errorGuardado.value = e?.message ? `No se pudo guardar en el servidor: ${e.message}` : 'No se pudo guardar en el servidor.';
    }
  };

  const setHabilitado = (v: boolean) => guardarCambio({ habilitado: v }, { enabled: v });
  const setDuracion = (seg: number) => {
    const s = clampDuracionSeg(seg);
    return guardarCambio({ duracionSeg: s }, { defaultSec: s });
  };
  const setAutoIniciar = (v: boolean) => guardarCambio({ autoIniciar: v }, { autoStart: v });

  /** Carga los ajustes del servidor (llamar tras iniciar sesión / al abrir la app) */
  const cargarDesdeServidor = async () => {
    if (sincronizando.value) return;
    sincronizando.value = true;
    try {
      aplicar(await sincronizarAjustes(depsReales));
      errorGuardado.value = '';
    } catch {
      // Sin conexión: nos quedamos con la caché local
    } finally {
      sincronizando.value = false;
    }
  };

  /** Inicia o reinicia con la duración por defecto (o la indicada) */
  const iniciar = (seg?: number) => {
    if (!habilitado.value) return;
    estado.value = iniciarEstado(seg ?? duracionSeg.value, Date.now());
    ciclo.value++;
  };
  /**
   * Llamar al marcar una serie como hecha: respeta el ajuste de auto-inicio y resuelve
   * la duración (serie > ejercicio > global).
   */
  const iniciarAuto = (serie?: { DescansoSeg?: number | null } | null, ejercicio?: { DescansoSeg?: number | null } | null) => {
    if (!habilitado.value || !autoIniciar.value) return;
    const seg = resolverDescanso(serie, ejercicio, { duracionSeg: duracionSeg.value });
    if (seg !== null) iniciar(seg); // 0 = serie o ejercicio sin descanso: no se arranca
  };
  const cerrar = () => { estado.value = null; };

  return {
    habilitado: computed(() => habilitado.value),
    duracionSeg: computed(() => duracionSeg.value),
    autoIniciar: computed(() => autoIniciar.value),
    errorGuardado: computed(() => errorGuardado.value),
    estado,
    ciclo,
    setHabilitado,
    setDuracion,
    setAutoIniciar,
    cargarDesdeServidor,
    iniciar,
    iniciarAuto,
    cerrar,
  };
}

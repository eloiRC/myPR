import { ref, computed } from 'vue';

// ---------- Lógica pura (testeable, sin dependencias de Vue ni del DOM) ----------

export const PASO_AJUSTE_SEG = 15;
export const DURACIONES_PRESET = [60, 90, 120, 180];
export const DURACION_MIN_SEG = 5;
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

// ---------- Ajustes persistidos por dispositivo ----------

const CLAVE_AJUSTES = 'mypr_rest_timer_settings';

interface AjustesTemporizador {
  habilitado: boolean;
  duracionSeg: number;
  autoIniciar: boolean;
}

const AJUSTES_DEFECTO: AjustesTemporizador = {
  habilitado: false,
  duracionSeg: DURACION_DEFECTO_SEG,
  autoIniciar: true,
};

export const leerAjustes = (): AjustesTemporizador => {
  try {
    const raw = localStorage.getItem(CLAVE_AJUSTES);
    if (!raw) return { ...AJUSTES_DEFECTO };
    const p = JSON.parse(raw);
    return {
      habilitado: p?.habilitado === true,
      duracionSeg: clampDuracionSeg(Number(p?.duracionSeg ?? DURACION_DEFECTO_SEG)),
      autoIniciar: p?.autoIniciar !== false,
    };
  } catch {
    return { ...AJUSTES_DEFECTO };
  }
};

const inicial = leerAjustes();
const habilitado = ref(inicial.habilitado);
const duracionSeg = ref(inicial.duracionSeg);
const autoIniciar = ref(inicial.autoIniciar);

const guardarAjustes = () => {
  try {
    localStorage.setItem(CLAVE_AJUSTES, JSON.stringify({
      habilitado: habilitado.value,
      duracionSeg: duracionSeg.value,
      autoIniciar: autoIniciar.value,
    }));
  } catch {
    // Almacenamiento no disponible: el ajuste solo vale para esta sesión
  }
};

// ---------- Estado compartido del temporizador en marcha ----------

/** null = no hay temporizador visible */
const estado = ref<EstadoTemporizador | null>(null);
/** Se incrementa en cada inicio/reinicio (distingue de los ajustes ±15 s) */
const ciclo = ref(0);

export function useRestTimer() {
  const setHabilitado = (v: boolean) => {
    habilitado.value = v;
    if (!v) estado.value = null;
    guardarAjustes();
  };
  const setDuracion = (seg: number) => {
    duracionSeg.value = clampDuracionSeg(seg);
    guardarAjustes();
  };
  const setAutoIniciar = (v: boolean) => {
    autoIniciar.value = v;
    guardarAjustes();
  };

  /** Inicia o reinicia con la duración por defecto (o la indicada) */
  const iniciar = (seg?: number) => {
    if (!habilitado.value) return;
    estado.value = iniciarEstado(seg ?? duracionSeg.value, Date.now());
    ciclo.value++;
  };
  /** Llamar al marcar una serie como hecha: respeta el ajuste de auto-inicio */
  const iniciarAuto = () => {
    if (habilitado.value && autoIniciar.value) iniciar();
  };
  const cerrar = () => { estado.value = null; };

  return {
    habilitado: computed(() => habilitado.value),
    duracionSeg: computed(() => duracionSeg.value),
    autoIniciar: computed(() => autoIniciar.value),
    estado,
    ciclo,
    setHabilitado,
    setDuracion,
    setAutoIniciar,
    iniciar,
    iniciarAuto,
    cerrar,
  };
}

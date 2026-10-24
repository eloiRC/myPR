// Lógica pura de la pantalla de entreno: agrupación por ejercicio, siguiente serie pendiente,
// resumen de sesión, tiempo de sesión y elección del entreno «actual».
import { kgDisplay, mmss } from './segmentos';

export interface SerieBase {
  SerieId: number;
  ExerciciId: number;
  Kg: number;
  Reps: number;
  Carga?: number;
  PR?: boolean;
  Data?: number;
  DescansoSeg?: number | null;
}

export type EsHecha = (serieId: number) => boolean;

export interface FilaGrupo<S> {
  serie: S;
  /** Número de serie dentro de su ejercicio (1, 2, 3…) */
  n: number;
  /** Posición en el orden global del entreno (la que usa la API para reordenar) */
  idx: number;
}

export interface GrupoEjercicio<S> {
  ejercicioId: number;
  filas: FilaGrupo<S>[];
  hechas: number;
}

/**
 * Agrupa las series en tramos de un mismo ejercicio, respetando el orden real del entreno: solo se
 * juntan las series consecutivas. Si el usuario alterna ejercicios (superseries), cada vuelta es un
 * tramo propio. La numeración (n) sigue contando por ejercicio a lo largo de todo el entreno.
 */
export function agruparPorEjercicio<S extends SerieBase>(series: S[], esHecha: EsHecha): GrupoEjercicio<S>[] {
  const grupos: GrupoEjercicio<S>[] = [];
  const cuenta = new Map<number, number>();
  series.forEach((serie, idx) => {
    let g = grupos[grupos.length - 1];
    if (!g || g.ejercicioId !== serie.ExerciciId) {
      g = { ejercicioId: serie.ExerciciId, filas: [], hechas: 0 };
      grupos.push(g);
    }
    const n = (cuenta.get(serie.ExerciciId) ?? 0) + 1;
    cuenta.set(serie.ExerciciId, n);
    g.filas.push({ serie, n, idx });
    if (esHecha(serie.SerieId)) g.hechas++;
  });
  return grupos;
}

/** Posición (0..n-1) de una serie bajo un punto x de una tira de ancho `ancho`; recorta en los extremos. */
export function indiceEnTira(x: number, ancho: number, n: number): number {
  if (n <= 0 || ancho <= 0) return 0;
  return Math.min(n - 1, Math.max(0, Math.floor((x / ancho) * n)));
}

/** Primera serie no hecha según el orden del entreno (null si todas están hechas o no hay series). */
export function siguientePendiente<S extends SerieBase>(series: S[], esHecha: EsHecha): S | null {
  return series.find(s => !esHecha(s.SerieId)) ?? null;
}

export interface ResumenSesion {
  /** Volumen de las series hechas, en toneladas */
  volumenT: number;
  hechas: number;
  total: number;
  /** Ejercicios con al menos una serie hecha */
  ejercicios: number;
  /** Series hechas que son récord personal */
  prs: number;
  duracionSeg: number;
}

export function resumenSesion<S extends SerieBase>(series: S[], esHecha: EsHecha, duracionSeg: number): ResumenSesion {
  const hechas = series.filter(s => esHecha(s.SerieId));
  const kg = hechas.reduce((acc, s) => acc + (s.Carga || s.Kg * s.Reps), 0);
  return {
    volumenT: Math.round(kg / 10) / 100,
    hechas: hechas.length,
    total: series.length,
    ejercicios: new Set(hechas.map(s => s.ExerciciId)).size,
    prs: hechas.filter(s => s.PR).length,
    duracionSeg: Math.max(0, Math.round(duracionSeg)),
  };
}

export const MAX_SESION_SEG = 6 * 3600;

/**
 * Inicio de la sesión: la hora de la primera serie del entreno. Si no hay series, o esa serie es de
 * hace más de 6 h (un entreno antiguo que se reabre), se cuenta desde que se abrió la pantalla.
 */
export function inicioSesion(series: { Data?: number }[], abiertoSeg: number, ahoraSeg: number): number {
  const datas = series.map(s => s.Data).filter((d): d is number => typeof d === 'number' && d > 0);
  if (!datas.length) return abiertoSeg;
  const primera = Math.min(...datas);
  if (primera > ahoraSeg || ahoraSeg - primera > MAX_SESION_SEG) return abiertoSeg;
  return primera;
}

/** Tiempo de sesión para el display: m:ss por debajo de 1 h y h:mm a partir de ahí. */
export function formatoSesion(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  if (s < 3600) return mmss(s);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}

/** Kg en texto con coma decimal española: 82,5 */
export function kgTexto(kg: number): string {
  return kgDisplay(kg).replace('.', ',');
}

/**
 * Entre los entrenos recientes, el de hoy si lo hay (el más reciente); null si hay que crear uno.
 * «Hoy» es el día natural local.
 */
export function elegirEntrenoActual(entrenos: { EntrenoId: number; Data: number }[], ahoraSeg: number): number | null {
  if (!entrenos.length) return null;
  const ultimo = entrenos.reduce((a, b) => (b.Data > a.Data || (b.Data === a.Data && b.EntrenoId > a.EntrenoId) ? b : a));
  const mismoDia = new Date(ultimo.Data * 1000).toDateString() === new Date(ahoraSeg * 1000).toDateString();
  return mismoDia ? ultimo.EntrenoId : null;
}

import { describe, it, expect } from 'vitest';
import {
  agruparPorEjercicio, siguientePendiente, resumenSesion, inicioSesion, formatoSesion, kgTexto, elegirEntrenoActual, indiceEnTira,
} from '../utils/entreno';
import { siguienteFase, autoScrollDelta, debeIgnorarClick, ZONA_AUTOSCROLL_PX, PASO_AUTOSCROLL_MAX } from '../utils/reordenarTactil';

const s = (SerieId: number, ExerciciId: number, extra: object = {}) => ({ SerieId, ExerciciId, Kg: 50, Reps: 10, ...extra });
const hechas = (...ids: number[]) => (id: number) => ids.includes(id);

describe('agruparPorEjercicio', () => {
  it('agrupa solo series consecutivas y numera por ejercicio', () => {
    const g = agruparPorEjercicio([s(1, 7), s(2, 9), s(3, 7), s(4, 7)], hechas(1, 2));
    expect(g.map(x => x.ejercicioId)).toEqual([7, 9, 7]);
    expect(g[0].filas.map(f => [f.serie.SerieId, f.n, f.idx])).toEqual([[1, 1, 0]]);
    expect(g[2].filas.map(f => [f.serie.SerieId, f.n, f.idx])).toEqual([[3, 2, 2], [4, 3, 3]]);
    expect(g.map(x => x.hechas)).toEqual([1, 1, 0]);
  });
  it('lista vacía', () => expect(agruparPorEjercicio([], () => false)).toEqual([]));
});

describe('siguientePendiente', () => {
  it('devuelve la primera no hecha según el orden', () => {
    const series = [s(1, 1), s(2, 1), s(3, 2)];
    expect(siguientePendiente(series, hechas(1, 3))?.SerieId).toBe(2);
  });
  it('null si todas hechas o no hay series', () => {
    expect(siguientePendiente([s(1, 1)], hechas(1))).toBeNull();
    expect(siguientePendiente([], () => false)).toBeNull();
  });
});

describe('resumenSesion', () => {
  it('cuenta solo series hechas', () => {
    const series = [s(1, 1, { Carga: 500, PR: true }), s(2, 1, { Carga: 600 }), s(3, 2, { Carga: 1000, PR: true })];
    const r = resumenSesion(series, hechas(1, 2), 125.4);
    expect(r).toEqual({ volumenT: 1.1, hechas: 2, total: 3, ejercicios: 1, prs: 1, duracionSeg: 125 });
  });
  it('usa kg×reps si no hay Carga', () => {
    expect(resumenSesion([s(1, 1)], hechas(1), 0).volumenT).toBe(0.5);
  });
});

describe('tiempo de sesión', () => {
  it('empieza en la primera serie si es reciente', () => {
    expect(inicioSesion([{ Data: 2000 }, { Data: 1500 }], 3000, 3600)).toBe(1500);
  });
  it('sin series o con series antiguas cuenta desde que se abrió', () => {
    expect(inicioSesion([], 3000, 3600)).toBe(3000);
    expect(inicioSesion([{ Data: 1 }], 90000, 100000)).toBe(90000);
  });
  it('formatea m:ss y h:mm', () => {
    expect(formatoSesion(65)).toBe('1:05');
    expect(formatoSesion(3725)).toBe('1:02');
  });
  it('kg con coma', () => {
    expect(kgTexto(82.5)).toBe('82,5');
    expect(kgTexto(80)).toBe('80');
  });
});

describe('elegirEntrenoActual', () => {
  const ahora = Math.floor(new Date(2026, 5, 10, 12, 0, 0).getTime() / 1000);
  it('devuelve el de hoy más reciente', () => {
    const hoy = ahora - 3600;
    expect(elegirEntrenoActual([{ EntrenoId: 1, Data: ahora - 86400 * 3 }, { EntrenoId: 2, Data: hoy }], ahora)).toBe(2);
  });
  it('null si el último es de otro día o no hay entrenos', () => {
    expect(elegirEntrenoActual([{ EntrenoId: 1, Data: ahora - 86400 * 2 }], ahora)).toBeNull();
    expect(elegirEntrenoActual([], ahora)).toBeNull();
  });
});

describe('pulsación larga', () => {
  it('mover más de 10 px antes de 450 ms es scroll', () => {
    expect(siguienteFase('esperando', { dx: 0, dy: 12, transcurridoMs: 100 })).toBe('scroll');
  });
  it('quieto 450 ms levanta la fila', () => {
    expect(siguienteFase('esperando', { dx: 3, dy: 3, transcurridoMs: 450 })).toBe('arrastrando');
    expect(siguienteFase('esperando', { dx: 3, dy: 3, transcurridoMs: 200 })).toBe('esperando');
  });
  it('arrastrando y scroll son estables', () => {
    expect(siguienteFase('arrastrando', { dx: 80, dy: 80, transcurridoMs: 900 })).toBe('arrastrando');
    expect(siguienteFase('scroll', { dx: 0, dy: 0, transcurridoMs: 900 })).toBe('scroll');
  });
  it('autoscroll solo cerca de los bordes y proporcional', () => {
    expect(autoScrollDelta(400, 800)).toBe(0);
    expect(autoScrollDelta(0, 800)).toBe(-PASO_AUTOSCROLL_MAX);
    expect(autoScrollDelta(800, 800)).toBe(PASO_AUTOSCROLL_MAX);
    expect(autoScrollDelta(ZONA_AUTOSCROLL_PX / 2, 800)).toBe(-PASO_AUTOSCROLL_MAX / 2);
    expect(autoScrollDelta(40, 800, 50, 0)).toBe(-PASO_AUTOSCROLL_MAX);
    expect(autoScrollDelta(700, 800, 0, 100)).toBeGreaterThan(0);
  });
  it('ignora el click justo tras un arrastre', () => {
    expect(debeIgnorarClick(1000, 1100)).toBe(true);
    expect(debeIgnorarClick(1000, 1500)).toBe(false);
    expect(debeIgnorarClick(null, 1100)).toBe(false);
  });
});

describe('indiceEnTira', () => {
  it('traduce x a posición y recorta en los extremos', () => {
    expect(indiceEnTira(0, 100, 10)).toBe(0);
    expect(indiceEnTira(55, 100, 10)).toBe(5);
    expect(indiceEnTira(100, 100, 10)).toBe(9);
    expect(indiceEnTira(-20, 100, 10)).toBe(0);
    expect(indiceEnTira(500, 100, 10)).toBe(9);
    expect(indiceEnTira(5, 0, 10)).toBe(0);
  });
});

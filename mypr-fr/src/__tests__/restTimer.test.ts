import { describe, it, expect, beforeEach } from 'vitest';
import {
  iniciarEstado, restanteMs, pausarEstado, reanudarEstado, ajustarEstado,
  progresoEstado, formatearMmSs, clampDuracionSeg, leerAjustes,
} from '../composables/useRestTimer';

describe('temporizador de descanso (lógica pura)', () => {
  const T0 = 1_000_000;

  it('calcula el restante desde el timestamp objetivo', () => {
    const e = iniciarEstado(90, T0);
    expect(e.finMs).toBe(T0 + 90_000);
    expect(restanteMs(e, T0)).toBe(90_000);
    // Aunque pasen 60 s de golpe (pestaña en segundo plano) el cálculo es correcto
    expect(restanteMs(e, T0 + 60_000)).toBe(30_000);
  });

  it('nunca baja de 0', () => {
    const e = iniciarEstado(60, T0);
    expect(restanteMs(e, T0 + 60_000)).toBe(0);
    expect(restanteMs(e, T0 + 999_999)).toBe(0);
  });

  it('pausa congela el tiempo y reanudar lo continúa', () => {
    const e = iniciarEstado(60, T0);
    const p = pausarEstado(e, T0 + 20_000);
    expect(p.pausadoMs).toBe(40_000);
    expect(restanteMs(p, T0 + 500_000)).toBe(40_000);
    const r = reanudarEstado(p, T0 + 100_000);
    expect(r.pausadoMs).toBeNull();
    expect(restanteMs(r, T0 + 110_000)).toBe(30_000);
  });

  it('pausar/reanudar es idempotente', () => {
    const e = iniciarEstado(60, T0);
    expect(reanudarEstado(e, T0)).toBe(e);
    const p = pausarEstado(e, T0);
    expect(pausarEstado(p, T0 + 5000)).toBe(p);
  });

  it('±15 s ajusta el restante y recorta en 0', () => {
    const e = iniciarEstado(60, T0);
    const mas = ajustarEstado(e, 15_000, T0 + 10_000);
    expect(restanteMs(mas, T0 + 10_000)).toBe(65_000);
    expect(mas.totalMs).toBe(65_000);
    const menos = ajustarEstado(e, -15_000, T0 + 50_000);
    expect(restanteMs(menos, T0 + 50_000)).toBe(0);
    const mucho = ajustarEstado(e, -15_000, T0 + 55_000);
    expect(restanteMs(mucho, T0 + 55_000)).toBe(0);
  });

  it('ajustar en pausa mantiene la pausa', () => {
    const p = pausarEstado(iniciarEstado(60, T0), T0 + 30_000);
    const a = ajustarEstado(p, -15_000, T0 + 99_000);
    expect(a.pausadoMs).toBe(15_000);
    expect(restanteMs(a, T0 + 200_000)).toBe(15_000);
    expect(ajustarEstado(p, -60_000, T0).pausadoMs).toBe(0);
  });

  it('progreso entre 0 y 1', () => {
    const e = iniciarEstado(100, T0);
    expect(progresoEstado(e, T0)).toBe(0);
    expect(progresoEstado(e, T0 + 25_000)).toBeCloseTo(0.25);
    expect(progresoEstado(e, T0 + 200_000)).toBe(1);
  });

  it('formatea mm:ss redondeando hacia arriba', () => {
    expect(formatearMmSs(90_000)).toBe('01:30');
    expect(formatearMmSs(89_001)).toBe('01:30');
    expect(formatearMmSs(0)).toBe('00:00');
    expect(formatearMmSs(-5)).toBe('00:00');
    expect(formatearMmSs(600_000)).toBe('10:00');
  });

  it('recorta la duración a un rango válido', () => {
    expect(clampDuracionSeg(1)).toBe(5);
    expect(clampDuracionSeg(99999)).toBe(900);
    expect(clampDuracionSeg(NaN)).toBe(90);
    expect(clampDuracionSeg(75.4)).toBe(75);
  });
});

describe('ajustes persistidos', () => {
  beforeEach(() => localStorage.clear());

  it('valores por defecto: apagado, 90 s, auto-inicio activo', () => {
    expect(leerAjustes()).toEqual({ habilitado: false, duracionSeg: 90, autoIniciar: true });
  });

  it('tolera JSON corrupto', () => {
    localStorage.setItem('mypr_rest_timer_settings', '{no-json');
    expect(leerAjustes().habilitado).toBe(false);
  });

  it('lee valores guardados y sanea la duración', () => {
    localStorage.setItem('mypr_rest_timer_settings', JSON.stringify({ habilitado: true, duracionSeg: 5000, autoIniciar: false }));
    expect(leerAjustes()).toEqual({ habilitado: true, duracionSeg: 900, autoIniciar: false });
  });
});

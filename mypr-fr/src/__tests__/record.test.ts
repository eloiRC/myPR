import { describe, it, expect } from 'vitest';
import { recordEjercicio } from '../utils/record';

describe('recordEjercicio', () => {
  it('sin PR ni historial no hay récord', () => {
    expect(recordEjercicio(0, [])).toEqual({ valor: 0, desfasado: false });
    expect(recordEjercicio(null, undefined)).toEqual({ valor: 0, desfasado: false });
  });
  it('usa el PR guardado cuando coincide con el historial', () => {
    expect(recordEjercicio(85, [{ PesoMaximo: 70 }, { PesoMaximo: 85 }])).toEqual({ valor: 85, desfasado: false });
  });
  it('nunca es menor que el máximo del historial (PR 75 vs gráfica 85)', () => {
    expect(recordEjercicio(75, [{ PesoMaximo: 60 }, { PesoMaximo: 85 }])).toEqual({ valor: 85, desfasado: true });
  });
  it('sin PR guardado pero con historial, usa el historial', () => {
    expect(recordEjercicio(0, [{ PesoMaximo: 40 }])).toEqual({ valor: 40, desfasado: true });
  });
});
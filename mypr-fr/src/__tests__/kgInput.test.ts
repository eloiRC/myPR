import { describe, it, expect } from 'vitest';
import { parseKgEscrito, resolverKgAlSalir, sumarKg, sumarReps } from '../utils/kgInput';
import { evaluarFormulaPeso, formatKgInput } from '../utils/pesoFormula';

describe('fórmulas de peso', () => {
  it('evalúa fórmulas con x y paréntesis', () => {
    expect(evaluarFormulaPeso('=20x2+20')).toBe(60);
    expect(evaluarFormulaPeso('=(10+5)*2')).toBe(30);
    expect(evaluarFormulaPeso('=10/4')).toBe(2.5);
  });
  it('rechaza lo inválido', () => {
    expect(evaluarFormulaPeso('20x2')).toBeNull();
    expect(evaluarFormulaPeso('=')).toBeNull();
    expect(evaluarFormulaPeso('=alert(1)')).toBeNull();
    expect(evaluarFormulaPeso('=(1+2')).toBeNull();
    expect(evaluarFormulaPeso('=1-5')).toBeNull();
  });
  it('formatea el kg (0 → vacío)', () => {
    expect(formatKgInput(0)).toBe('');
    expect(formatKgInput(22.5)).toBe('22.5');
  });
});

describe('entrada de kg', () => {
  it('parsea números y se salta fórmulas en curso', () => {
    expect(parseKgEscrito('12.5')).toBe(12.5);
    expect(parseKgEscrito('12.')).toBe(12);
    expect(parseKgEscrito('=20x')).toBeNull();
    expect(parseKgEscrito('abc')).toBeNull();
    expect(parseKgEscrito('')).toBeNull();
  });
  it('resuelve la fórmula al salir del campo', () => {
    expect(resolverKgAlSalir(' =20x2+20 ', 5)).toEqual({ tipo: 'formula', valor: 60, texto: '60' });
    expect(resolverKgAlSalir('=20x', 5)).toEqual({ tipo: 'invalida', texto: '5' });
    expect(resolverKgAlSalir('=20x', 0)).toEqual({ tipo: 'invalida', texto: '' });
    expect(resolverKgAlSalir('30', 5)).toEqual({ tipo: 'nada' });
  });
  it('los steppers no bajan de 0 y redondean', () => {
    expect(sumarKg(20, 2.5)).toBe(22.5);
    expect(sumarKg(1, -2.5)).toBe(0);
    expect(sumarKg(0.1, 0.2)).toBe(0.3);
    expect(sumarReps(5, 1)).toBe(6);
    expect(sumarReps(0, -1)).toBe(0);
  });
});

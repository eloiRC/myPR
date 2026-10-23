import { describe, it, expect } from 'vitest';
import { segmentosDe, celdasDe, mmss, kgDisplay } from '../utils/segmentos';

describe('segmentos', () => {
  it('cada dígito enciende sus segmentos', () => {
    expect(segmentosDe('8').sort().join('')).toBe('abcdefg');
    expect(segmentosDe('1').sort().join('')).toBe('bc');
    expect(segmentosDe('-')).toEqual(['g']);
    expect(segmentosDe('?')).toEqual([]);
  });
  it('trocea punto decimal, dos puntos y huecos', () => {
    expect(celdasDe('82,5').map(c => c.tipo)).toEqual(['digito', 'digito', 'punto', 'digito']);
    expect(celdasDe('1:30').map(c => c.tipo)).toEqual(['digito', 'dospuntos', 'digito', 'digito']);
    expect(celdasDe('5 8').map(c => c.tipo)).toEqual(['digito', 'hueco', 'digito']);
  });
  it('mmss y kgDisplay', () => {
    expect(mmss(90)).toBe('1:30');
    expect(mmss(5)).toBe('0:05');
    expect(kgDisplay(80)).toBe('80');
    expect(kgDisplay(82.5)).toBe('82.5');
    expect(kgDisplay(22.75)).toBe('22.8');
  });
});

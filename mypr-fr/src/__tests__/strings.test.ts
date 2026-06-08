import { describe, it, expect } from 'vitest';
import { formatearTexto } from '../utils/ejercicioUtils';

describe('formatearTexto', () => {
  it('should capitalize first letter of each word', () => {
    expect(formatearTexto('press de banca')).toBe('Press De Banca');
  });

  it('should handle single word', () => {
    expect(formatearTexto('press')).toBe('Press');
  });

  it('should handle empty string', () => {
    expect(formatearTexto('')).toBe('');
  });

  it('should handle already formatted text', () => {
    expect(formatearTexto('Press Banca')).toBe('Press Banca');
  });

  it('should handle mixed case', () => {
    expect(formatearTexto('PRESS DE BANCA')).toBe('Press De Banca');
  });
});

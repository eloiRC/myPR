import { describe, it, expect } from 'vitest';
import { renderMemoryBlock, type MemoryRow } from '../coachMemory';
import { COACH_PERSONA, buildVolatileContext } from '../coachPrompt';

const NOW = Math.floor(Date.UTC(2026, 9, 23) / 1000);
const DAY = 86400;
const mem = (over: Partial<MemoryRow>): MemoryRow => ({
  MemoryId: 1, UserId: 1, Kind: 'nota', Text: 'texto', Status: 'activa', CreatedAt: NOW, UpdatedAt: NOW, ...over,
});

describe('renderMemoryBlock', () => {
  it('estado vacío', () => {
    expect(renderMemoryBlock([], NOW)).toContain('Sin memorias');
  });

  it('muestra id, tipo, fecha y texto', () => {
    const out = renderMemoryBlock([mem({ MemoryId: 7, Kind: 'objetivo', Text: 'Press banca 100kg', CreatedAt: NOW - 10 * DAY })], NOW);
    expect(out.startsWith('MEMORIA DEL USUARIO')).toBe(true);
    expect(out).toContain('[id 7]');
    expect(out).toContain('objetivo');
    expect(out).toContain('2026-10-13');
    expect(out).toContain('Press banca 100kg');
    expect(out).not.toContain('REVISAR');
  });

  it('marca para revisar las lesiones activas de más de 3 días', () => {
    const viejo = renderMemoryBlock([mem({ Kind: 'lesion', Text: 'Hombro', CreatedAt: NOW - 5 * DAY })], NOW);
    expect(viejo).toContain('REVISAR');
    const reciente = renderMemoryBlock([mem({ Kind: 'lesion', Text: 'Hombro', CreatedAt: NOW - 1 * DAY })], NOW);
    expect(reciente).not.toContain('REVISAR');
  });

  it('inyecta como máximo 40 memorias', () => {
    const many = Array.from({ length: 60 }, (_, i) => mem({ MemoryId: i + 1 }));
    expect(renderMemoryBlock(many, NOW).split('\n').filter(l => l.startsWith('- ')).length).toBe(40);
  });
});

describe('prompt estable vs volátil', () => {
  it('el bloque estable no contiene datos por petición ni formatos antiguos', () => {
    expect(COACH_PERSONA).not.toMatch(/json_plan|TITULO_AUTO/i);
    expect(COACH_PERSONA).toContain('Nunca muestres IDs de ejercicio al usuario');
    expect(COACH_PERSONA).toContain('add_sets');
    expect(COACH_PERSONA).toContain('delete_set');
    expect(COACH_PERSONA).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // sin fechas
  });

  it('el volátil lleva fecha, memoria, grupos musculares y análisis', () => {
    const v = buildVolatileContext({
      dateLabel: '23/10/2026', nowSec: NOW, entreno: { EntrenoId: 5, Nom: 'Entreno #3' }, seriesToday: '[]',
      memories: [mem({ MemoryId: 2, Kind: 'lesion', Text: 'Rodilla' })],
      muscleGroups: [{ GrupMuscularId: 4, Nom: 'Pecho' }], analysisText: 'ANALISIS', userPrompt: 'Háblame de tú',
    });
    expect(v).toContain('23/10/2026');
    expect(v).toContain('MEMORIA DEL USUARIO');
    expect(v).toContain('- 4: Pecho');
    expect(v).toContain('ANALISIS');
    expect(v).toContain('INSTRUCCIONES PERSONALIZADAS DEL USUARIO');
    expect(v).toContain('Nombre automático: Sí');
  });
});

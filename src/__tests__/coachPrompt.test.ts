import { describe, it, expect } from 'vitest';
import { renderMemoryBlock, type MemoryRow } from '../coachMemory';
import { analyzeTraining } from '../coachAnalysis';
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
      muscleGroups: [{ GrupMuscularId: 4, Nom: 'Pecho' }], analysisText: 'ANALISIS',
    });
    expect(v).toContain('23/10/2026');
    expect(v).toContain('MEMORIA DEL USUARIO');
    expect(v).toContain('- 4: Pecho');
    expect(v).toContain('ANALISIS');
    expect(v).not.toContain('INSTRUCCIONES PERSONALIZADAS');
    expect(v).toContain('Nombre automático: Sí');
  });
});

describe('descansos en el prompt', () => {
  it('COACH_PERSONA define las reglas de descanso', () => {
    expect(COACH_PERSONA).toContain('set_exercise_rest');
    expect(COACH_PERSONA).toContain('restSec');
    expect(COACH_PERSONA).toMatch(/FUERZA ~150-240 s/);
    expect(COACH_PERSONA).toMatch(/HIPERTROFIA ~60-120 s/);
    expect(COACH_PERSONA).toMatch(/METABÓLICO ~30-60 s/);
    expect(COACH_PERSONA).toContain('NUNCA cambies el ajuste global');
  });

  const base = {
    dateLabel: '23/10/2026', nowSec: NOW, entreno: { EntrenoId: 5, Nom: 'Entreno #3' }, memories: [],
    muscleGroups: [{ GrupMuscularId: 4, Nom: 'Pecho' }], analysisText: 'A',
  };

  it('el contexto volátil incluye el descanso global y el auto-inicio', () => {
    const v = buildVolatileContext({ ...base, seriesToday: '[]', restTimer: { enabled: true, defaultSec: 120, autoStart: false } });
    expect(v).toContain('Temporizador: activado');
    expect(v).toContain('Descanso global por defecto: 120 s');
    expect(v).toContain('Inicio automático al marcar una serie: no');
  });

  it('las series de hoy llevan su descanso (vienen en el JSON) y sin datos no rompe', () => {
    const v = buildVolatileContext({ ...base, seriesToday: JSON.stringify([{ SerieId: 1, DescansoSeg: 150 }]) });
    expect(v).toContain('"DescansoSeg":150');
    expect(v).toContain('Sin datos');
  });

  it('el catálogo muestra el descanso por defecto del ejercicio', () => {
    const a = analyzeTraining({
      rows: [], muscleGroups: [{ GrupMuscularId: 1, Nom: 'Espalda' }], now: NOW,
      exercises: [
        { ExerciciId: 1, Nom: 'Peso Muerto', PR: 0, DescansoSeg: 180, GrupMuscular1: 1 },
        { ExerciciId: 2, Nom: 'Remo', PR: 0, DescansoSeg: null, GrupMuscular1: 1 },
      ],
    });
    expect(a.text).toMatch(/ID: 1 - Peso Muerto .*descanso 180 s/);
    expect(a.text).not.toMatch(/ID: 2 - Remo .*descanso/);
  });
});

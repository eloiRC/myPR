import { describe, it, expect } from 'vitest';
import { compareExerciseNames, exerciseTokens, findSimilarExercises, executeTool, TOOL_DEFS, createExerciseInput, type ToolContext } from '../coachTools';
import { analyzeTraining, type ExerciseRow, type HistoryRow } from '../coachAnalysis';
import { archivarExercici } from '../schema';

describe('similitud de nombres de ejercicio', () => {
  it('normaliza acentos, puntuación, relleno y plurales', () => {
    expect(exerciseTokens('Jalón al pecho')).toEqual(['jalon', 'pecho']);
    expect(exerciseTokens('Press de banca (con mancuernas)')).toEqual(['press', 'banca', 'mancuerna']);
    expect(exerciseTokens('Elevaciones laterales')).toEqual(['elevacion', 'lateral']);
  });

  it('"Press banca" vs "press de banca": mismo ejercicio (exacto tras normalizar)', () => {
    expect(compareExerciseNames('Press banca', 'press de banca')).toBe('exact');
    expect(compareExerciseNames('Press Banca', 'Press Bancas')).not.toBe('different');
  });

  it('"Curl martillo" vs "Curl bíceps": distintos', () => {
    expect(compareExerciseNames('Curl martillo', 'Curl bíceps')).toBe('different');
  });

  it('"Jalón al pecho" vs "Jalon pecho agarre estrecho": parecidos por contención', () => {
    expect(compareExerciseNames('Jalón al pecho', 'Jalon pecho agarre estrecho')).toBe('similar');
  });

  it('parecidos por Jaccard y por Levenshtein', () => {
    // {remo, polea, baja} vs {remo, polea, baja, sentado}: Jaccard 0.75
    expect(compareExerciseNames('Remo en polea baja', 'Remo polea baja sentado')).toBe('similar');
    // errata
    expect(compareExerciseNames('Sentadilla bulgara', 'Sentadila bulgara')).toBe('similar');
    expect(compareExerciseNames('Sentadilla', 'Peso muerto')).toBe('different');
  });

  it('findSimilarExercises separa exactos y parecidos', () => {
    const cat = [
      { ExerciciId: 1, Nom: 'Press Banca' },
      { ExerciciId: 2, Nom: 'Press Banca Inclinado' },
      { ExerciciId: 3, Nom: 'Curl Bíceps' },
    ];
    const r = findSimilarExercises('Press de banca', cat);
    expect(r.exact.map(e => e.ExerciciId)).toEqual([1]);
    expect(r.similar.map(e => e.ExerciciId)).toEqual([2]);
  });
});

describe('create_exercise evita duplicados', () => {
  const mkCtx = (rows: { ExerciciId: number; Nom: string; Archivat?: number }[]) => {
    const inserts: any[][] = [];
    const db = {
      prepare: (sql: string) => ({
        bind: (...a: any[]) => ({
          all: async () => ({ results: rows }),
          run: async () => { inserts.push([sql, ...a]); return { meta: { last_row_id: 99, changes: 1 } }; },
        }),
      }),
    };
    const ctx = {
      db, userId: 7, entrenoId: 1, validExerciseIds: new Set(rows.map(r => r.ExerciciId)), validMuscleGroupIds: new Set([1]),
      deps: {}, state: { workoutUpdated: false },
    } as unknown as ToolContext;
    return { ctx, inserts };
  };

  it('el schema y la definición JSON aceptan confirmedNew', () => {
    expect(createExerciseInput.safeParse({ name: 'Press inclinado', muscleGroupIds: [1], confirmedNew: true }).success).toBe(true);
    const def = TOOL_DEFS.find(t => t.name === 'create_exercise') as any;
    expect(def.parameters.properties.confirmedNew).toEqual({ type: 'boolean' });
    expect(def.parameters.required).not.toContain('confirmedNew');
  });

  it('nombre exacto normalizado: falla aunque se confirme (también si está archivado)', async () => {
    const { ctx, inserts } = mkCtx([{ ExerciciId: 5, Nom: 'Press Banca', Archivat: 1 }]);
    const r = await executeTool(ctx, 'create_exercise', { name: 'press de banca', muscleGroupIds: [1], confirmedNew: true });
    expect(r.isError).toBe(true);
    expect(r.content).toContain('exerciseId 5');
    expect(r.content).toContain('archivado');
    expect(inserts).toEqual([]);
  });

  it('nombre parecido: falla listando los parecidos; con confirmedNew se crea', async () => {
    const { ctx, inserts } = mkCtx([{ ExerciciId: 3, Nom: 'Jalón Al Pecho' }]);
    const r = await executeTool(ctx, 'create_exercise', { name: 'Jalon pecho agarre estrecho', muscleGroupIds: [1] });
    expect(r.isError).toBe(true);
    expect(r.content).toContain('exerciseId 3');
    expect(r.content).toContain('confirmedNew');
    expect(inserts).toEqual([]);

    const r2 = await executeTool(ctx, 'create_exercise', { name: 'Jalon pecho agarre estrecho', muscleGroupIds: [1], confirmedNew: true });
    expect(r2.isError).toBe(false);
    expect(JSON.parse(r2.content)).toEqual({ exerciseId: 99, name: 'Jalon Pecho Agarre Estrecho' });
    expect(ctx.validExerciseIds.has(99)).toBe(true);
  });

  it('nombre distinto: se crea sin confirmación', async () => {
    const { ctx, inserts } = mkCtx([{ ExerciciId: 3, Nom: 'Curl Bíceps' }]);
    const r = await executeTool(ctx, 'create_exercise', { name: 'Curl martillo', muscleGroupIds: [1] });
    expect(r.isError).toBe(false);
    expect(inserts.length).toBe(1);
  });
});

describe('ejercicios archivados', () => {
  it('schema del endpoint', () => {
    expect(archivarExercici.safeParse({ exerciciId: 3, archivat: true }).success).toBe(true);
    expect(archivarExercici.safeParse({ exerciciId: 3, archivat: 1 }).success).toBe(false);
    expect(archivarExercici.safeParse({ exerciciId: 0, archivat: false }).success).toBe(false);
  });

  it('add_sets rechaza un ejercicio archivado con un error claro y sin insertar', async () => {
    const calls: any[] = [];
    const ctx = {
      db: {} as any, userId: 1, entrenoId: 1,
      validExerciseIds: new Set([1, 2]), archivedExerciseIds: new Set([2]), validMuscleGroupIds: new Set([1]),
      deps: { addSerie: async () => { calls.push(1); return { serieId: 1, newPr: false, cargaTotal: 0 }; } },
      state: { workoutUpdated: false },
    } as unknown as ToolContext;
    const r = await executeTool(ctx, 'add_sets', { sets: [{ exerciseId: 1, kg: 10, reps: 5 }, { exerciseId: 2, kg: 10, reps: 5 }] });
    expect(r.isError).toBe(true);
    expect(r.content).toContain('archivado');
    expect(r.content).toContain('desarchivarlo en Ejercicios');
    expect(calls).toEqual([]);
    expect(ctx.state.workoutUpdated).toBe(false);
  });

  it('edit_set no permite pasar una serie a un ejercicio archivado', async () => {
    const runs: any[] = [];
    const db = {
      prepare: () => ({ bind: () => ({ first: async () => ({ SerieId: 4, ExerciciId: 1, Kg: 50, Reps: 8, DescansoSeg: null }), run: async () => { runs.push(1); return { meta: { changes: 1 } }; } }) }),
    };
    const ctx = {
      db, userId: 1, entrenoId: 1,
      validExerciseIds: new Set([1, 2]), archivedExerciseIds: new Set([2]), validMuscleGroupIds: new Set([1]),
      deps: {}, state: { workoutUpdated: false },
    } as unknown as ToolContext;
    const r = await executeTool(ctx, 'edit_set', { serieId: 4, exerciseId: 2 });
    expect(r.isError).toBe(true);
    expect(r.content).toContain('archivado');
    expect(runs).toEqual([]);
  });

  it('el análisis no ofrece archivados (catálogo, rotación) pero el historial los nombra', () => {
    const NOW = 1_800_000_000;
    const exercises: ExerciseRow[] = [
      { ExerciciId: 1, Nom: 'Press Banca', PR: 100, GrupMuscular1: 1 },
      { ExerciciId: 2, Nom: 'Press Hammer', PR: 90, GrupMuscular1: 1, Archivat: 1 },
      { ExerciciId: 3, Nom: 'Aperturas', PR: 20, GrupMuscular1: 1 },
    ];
    const rows: HistoryRow[] = [
      { EntrenoId: 1, Nom: 'E1', Data: NOW - 30 * 86400, ExerciciId: 2, NomExercici: null, Kg: 80, Reps: 8 },
    ];
    const a = analyzeTraining({ rows, exercises, muscleGroups: [{ GrupMuscularId: 1, Nom: 'Pectoral' }], now: NOW });
    const catalog = a.text.split('### CATÁLOGO DE EJERCICIOS')[1];
    expect(catalog).not.toContain('Press Hammer');
    expect(catalog).toContain('Aperturas');
    const rotation = a.text.split('### CANDIDATOS DE ROTACIÓN')[1].split('###')[0];
    expect(rotation).not.toContain('Press Hammer');
    const recent = a.text.split('### ÚLTIMAS SESIONES')[1].split('###')[0];
    expect(recent).toContain('Press Hammer (archivado)');
    expect([...a.archivedExerciseIds]).toEqual([2]);
    expect(a.validExerciseIds.has(2)).toBe(true);
  });
});

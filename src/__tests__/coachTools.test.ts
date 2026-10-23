import { describe, it, expect } from 'vitest';
import {
  addSetsInput, editSetInput, deleteSetInput, updateWorkoutInput, createExerciseInput,
  setExerciseRestInput, saveMemoryInput, updateMemoryInput, deleteMemoryInput, capitalizeName, findInvalidExerciseIds,
  executeTool, TOOL_DEFS, MAX_SETS_PER_CALL, type ToolContext,
} from '../coachTools';
import { memoryUpdate, memoryDelete } from '../schema';

describe('schemas de herramientas', () => {
  it('add_sets: válido e inválido', () => {
    expect(addSetsInput.safeParse({ sets: [{ exerciseId: 3, kg: 80, reps: 8 }] }).success).toBe(true);
    expect(addSetsInput.safeParse({ sets: [{ exerciseId: 3, kg: 0, reps: 12 }] }).success).toBe(true); // peso corporal
    expect(addSetsInput.safeParse({ sets: [] }).success).toBe(false);
    expect(addSetsInput.safeParse({ sets: [{ exerciseId: 3, kg: -1, reps: 8 }] }).success).toBe(false);
    expect(addSetsInput.safeParse({ sets: [{ exerciseId: 3, kg: 80, reps: 8.5 }] }).success).toBe(false);
    const many = Array.from({ length: MAX_SETS_PER_CALL + 1 }, () => ({ exerciseId: 1, kg: 10, reps: 5 }));
    expect(addSetsInput.safeParse({ sets: many }).success).toBe(false);
    expect(addSetsInput.safeParse({ sets: many.slice(0, MAX_SETS_PER_CALL) }).success).toBe(true);
  });

  it('edit_set exige algún campo a cambiar', () => {
    expect(editSetInput.safeParse({ serieId: 1, kg: 50 }).success).toBe(true);
    expect(editSetInput.safeParse({ serieId: 1 }).success).toBe(false);
    expect(editSetInput.safeParse({ serieId: 0, kg: 5 }).success).toBe(false);
  });

  it('delete_set', () => {
    expect(deleteSetInput.safeParse({ serieId: 9 }).success).toBe(true);
    expect(deleteSetInput.safeParse({ serieId: '9' }).success).toBe(false);
  });

  it('update_workout: rating 1-5 y al menos un campo', () => {
    expect(updateWorkoutInput.safeParse({ name: 'Pecho y Tríceps' }).success).toBe(true);
    expect(updateWorkoutInput.safeParse({ rating: 5 }).success).toBe(true);
    expect(updateWorkoutInput.safeParse({ rating: 6 }).success).toBe(false);
    expect(updateWorkoutInput.safeParse({ rating: 0 }).success).toBe(false);
    expect(updateWorkoutInput.safeParse({}).success).toBe(false);
  });

  it('create_exercise: 1 a 5 grupos', () => {
    expect(createExerciseInput.safeParse({ name: 'Press inclinado', muscleGroupIds: [1, 2] }).success).toBe(true);
    expect(createExerciseInput.safeParse({ name: 'Press inclinado', muscleGroupIds: [] }).success).toBe(false);
    expect(createExerciseInput.safeParse({ name: 'Press inclinado', muscleGroupIds: [1, 2, 3, 4, 5, 6] }).success).toBe(false);
    expect(createExerciseInput.safeParse({ name: 'ab', muscleGroupIds: [1] }).success).toBe(false);
  });

  it('herramientas de memoria', () => {
    expect(saveMemoryInput.safeParse({ kind: 'lesion', text: 'Dolor hombro derecho' }).success).toBe(true);
    expect(saveMemoryInput.safeParse({ kind: 'otra', text: 'Dolor hombro' }).success).toBe(false);
    expect(updateMemoryInput.safeParse({ id: 1, status: 'resuelta' }).success).toBe(true);
    expect(updateMemoryInput.safeParse({ id: 1, status: 'cerrada' }).success).toBe(false);
    expect(updateMemoryInput.safeParse({ id: 1 }).success).toBe(false);
    expect(deleteMemoryInput.safeParse({ id: 1 }).success).toBe(true);
  });

  it('schemas de endpoints de memoria', () => {
    expect(memoryUpdate.safeParse({ memoryId: 1, text: 'nuevo texto' }).success).toBe(true);
    expect(memoryUpdate.safeParse({ memoryId: 1 }).success).toBe(false);
    expect(memoryDelete.safeParse({ memoryId: 0 }).success).toBe(false);
  });
});

describe('descansos (restSec)', () => {
  it('add_sets: restSec opcional, 0 (sin descanso) o 15-900', () => {
    const base = { exerciseId: 3, kg: 80, reps: 8 };
    expect(addSetsInput.safeParse({ sets: [base] }).success).toBe(true);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: 15 }] }).success).toBe(true);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: 900 }] }).success).toBe(true);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: null }] }).success).toBe(true);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: 0 }] }).success).toBe(true);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: 14 }] }).success).toBe(false);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: -1 }] }).success).toBe(false);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: 901 }] }).success).toBe(false);
    expect(addSetsInput.safeParse({ sets: [{ ...base, restSec: 90.5 }] }).success).toBe(false);
  });

  it('edit_set: restSec cuenta como campo a cambiar y admite null', () => {
    expect(editSetInput.safeParse({ serieId: 1, restSec: 120 }).success).toBe(true);
    expect(editSetInput.safeParse({ serieId: 1, restSec: null }).success).toBe(true);
    expect(editSetInput.safeParse({ serieId: 1, restSec: 0 }).success).toBe(true);
    expect(editSetInput.safeParse({ serieId: 1, restSec: 5 }).success).toBe(false);
  });

  it('set_exercise_rest: restSec obligatorio (null borra)', () => {
    expect(setExerciseRestInput.safeParse({ exerciseId: 1, restSec: 180 }).success).toBe(true);
    expect(setExerciseRestInput.safeParse({ exerciseId: 1, restSec: null }).success).toBe(true);
    expect(setExerciseRestInput.safeParse({ exerciseId: 1 }).success).toBe(false);
    expect(setExerciseRestInput.safeParse({ exerciseId: 1, restSec: 1000 }).success).toBe(false);
  });

  const mkCtx = (changes = 1) => {
    const binds: any[][] = [];
    const db = { prepare: (_sql: string) => ({ bind: (...a: any[]) => { binds.push(a); return { run: async () => ({ meta: { changes } }) }; } }) };
    const ctx = {
      db, userId: 7, entrenoId: 1, validExerciseIds: new Set([1, 2]), validMuscleGroupIds: new Set([1]),
      deps: {}, state: { workoutUpdated: false },
    } as unknown as ToolContext;
    return { ctx, binds };
  };

  it('set_exercise_rest rechaza ejercicios que no son del usuario sin tocar la BD', async () => {
    const { ctx, binds } = mkCtx();
    const r = await executeTool(ctx, 'set_exercise_rest', { exerciseId: 99, restSec: 120 });
    expect(r.isError).toBe(true);
    expect(binds).toEqual([]);
  });

  it('set_exercise_rest guarda y filtra por usuario; null borra', async () => {
    const { ctx, binds } = mkCtx();
    const r = await executeTool(ctx, 'set_exercise_rest', { exerciseId: 2, restSec: 180 });
    expect(r.isError).toBe(false);
    expect(binds[0]).toEqual([180, 2, 7]);
    const r2 = await executeTool(ctx, 'set_exercise_rest', { exerciseId: 2, restSec: null });
    expect(r2.isError).toBe(false);
    expect(binds[1]).toEqual([null, 2, 7]);
  });

  it('set_exercise_rest valida el rango', async () => {
    const { ctx, binds } = mkCtx();
    expect((await executeTool(ctx, 'set_exercise_rest', { exerciseId: 1, restSec: 10 })).isError).toBe(true);
    expect(binds).toEqual([]);
  });

  it('add_sets pasa restSec a la dependencia (null si se omite)', async () => {
    const calls: any[] = [];
    const { ctx } = mkCtx();
    ctx.deps = { addSerie: async (e: number, kg: number, r: number, rest?: number | null) => { calls.push([e, kg, r, rest]); return { serieId: 1, newPr: false, cargaTotal: 1 }; } } as any;
    const r = await executeTool(ctx, 'add_sets', { sets: [{ exerciseId: 1, kg: 100, reps: 5, restSec: 180 }, { exerciseId: 2, kg: 20, reps: 12 }] });
    expect(r.isError).toBe(false);
    expect(calls).toEqual([[1, 100, 5, 180], [2, 20, 12, null]]);
  });
});

describe('validación de ids y nombres', () => {
  it('findInvalidExerciseIds', () => {
    const valid = new Set([1, 2, 3]);
    expect(findInvalidExerciseIds([1, 2], valid)).toEqual([]);
    expect(findInvalidExerciseIds([1, 99, 99, 100], valid)).toEqual([99, 100]);
  });

  it('un ejercicio creado pasa a ser válido en el mismo Set', () => {
    const valid = new Set([1]);
    expect(findInvalidExerciseIds([50], valid)).toEqual([50]);
    valid.add(50);
    expect(findInvalidExerciseIds([50], valid)).toEqual([]);
  });

  it('capitalizeName', () => {
    expect(capitalizeName('  press   inclinado con mancuernas ')).toBe('Press Inclinado Con Mancuernas');
    expect(capitalizeName('élevation latérale')).toBe('Élevation Latérale');
  });
});

describe('executeTool sin tocar BD', () => {
  const ctx = {
    db: {} as any, userId: 1, entrenoId: 1,
    validExerciseIds: new Set([1, 2]), validMuscleGroupIds: new Set([1]),
    deps: {} as any, state: { workoutUpdated: false },
  } as ToolContext;

  it('add_sets rechaza ids fuera del catálogo sin insertar nada', async () => {
    const r = await executeTool(ctx, 'add_sets', { sets: [{ exerciseId: 1, kg: 10, reps: 5 }, { exerciseId: 77, kg: 10, reps: 5 }] });
    expect(r.isError).toBe(true);
    expect(r.content).toContain('77');
    expect(ctx.state.workoutUpdated).toBe(false);
  });

  it('input inválido y herramienta desconocida devuelven error', async () => {
    expect((await executeTool(ctx, 'add_sets', { sets: 'x' })).isError).toBe(true);
    expect((await executeTool(ctx, 'create_exercise', { name: 'Curl', muscleGroupIds: [9] })).isError).toBe(true);
    expect((await executeTool(ctx, 'hack', {})).isError).toBe(true);
  });

  it('add_sets inserta con las dependencias y marca workoutUpdated', async () => {
    const calls: any[] = [];
    const c2 = {
      ...ctx, state: { workoutUpdated: false },
      deps: { addSerie: async (e: number, kg: number, r: number) => { calls.push([e, kg, r]); return { serieId: calls.length, newPr: false, cargaTotal: 100 }; } },
    } as unknown as ToolContext;
    const r = await executeTool(c2, 'add_sets', { sets: [{ exerciseId: 1, kg: 80.04, reps: 8 }, { exerciseId: 2, kg: 20, reps: 10 }] });
    expect(r.isError).toBe(false);
    expect(calls).toEqual([[1, 80, 8], [2, 20, 10]]);
    expect(c2.state.workoutUpdated).toBe(true);
  });
});

describe('definiciones de herramientas', () => {
  it('todas son estrictas y sin additionalProperties abiertas', () => {
    expect(TOOL_DEFS.map(t => t.name)).toEqual([
      'add_sets', 'edit_set', 'set_exercise_rest', 'delete_set', 'update_workout', 'create_exercise', 'save_memory', 'update_memory', 'delete_memory',
    ]);
    for (const t of TOOL_DEFS) {
      expect((t.parameters as any).additionalProperties).toBe(false);
      expect((t.parameters as any).type).toBe('object');
      // Modo estricto: sin minimum/maximum (los rangos se validan con zod)
      expect(JSON.stringify(t.parameters)).not.toMatch(/"(minimum|maximum|minItems|maxItems)"/);
    }
  });
});

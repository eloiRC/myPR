import { describe, it, expect } from 'vitest';
import { normalizeRequestId, shouldFlush, rowToJob, phaseForTool, isJobStale, effectiveJobView, decideJobRun, parseQuickReplies, STALE_JOB_MS } from '../chatJobs';
import { chatGPT } from '../schema';

describe('normalizeRequestId', () => {
  it('acepta un uuid y recorta espacios', () => {
    expect(normalizeRequestId('  abc-123 ')).toBe('abc-123');
  });
  it('devuelve undefined si falta o no es válido (clientes antiguos)', () => {
    expect(normalizeRequestId(undefined)).toBeUndefined();
    expect(normalizeRequestId(null)).toBeUndefined();
    expect(normalizeRequestId(42)).toBeUndefined();
    expect(normalizeRequestId('   ')).toBeUndefined();
    expect(normalizeRequestId('x'.repeat(101))).toBeUndefined();
  });
});

describe('shouldFlush', () => {
  it('no vuelca si no hay texto pendiente', () => {
    expect(shouldFlush(5000, 0, 0)).toBe(false);
  });
  it('respeta el intervalo de throttle', () => {
    expect(shouldFlush(1300, 1000, 10)).toBe(false);
    expect(shouldFlush(1400, 1000, 10)).toBe(true);
  });
});

describe('rowToJob', () => {
  it('mapea una fila de D1', () => {
    const job = rowToJob({ id: 'j', UserId: 3, Status: 'done', FullText: 'hola', WorkoutUpdated: 1, Error: null, CreatedAt: 9, RequestId: null });
    expect(job).toMatchObject({ id: 'j', userId: 3, status: 'done', fullText: 'hola', workoutUpdated: true, error: undefined, requestId: undefined });
  });
});

describe('phaseForTool', () => {
  it('etiqueta cada herramienta', () => {
    expect(phaseForTool('add_sets', { sets: [{}, {}, {}] })).toBe('Añadiendo 3 series…');
    expect(phaseForTool('add_sets', { sets: [{}] })).toBe('Añadiendo 1 serie…');
    expect(phaseForTool('add_sets', undefined)).toBe('Añadiendo series…');
    expect(phaseForTool('edit_set', {})).toBe('Editando una serie…');
    expect(phaseForTool('delete_set', {})).toBe('Borrando una serie…');
    expect(phaseForTool('update_workout', {})).toBe('Actualizando el entreno…');
    expect(phaseForTool('create_exercise', {})).toBe('Creando ejercicio…');
    for (const n of ['save_memory', 'update_memory', 'delete_memory']) expect(phaseForTool(n, {})).toBe('Actualizando memoria…');
    expect(phaseForTool('set_exercise_rest', {})).toBe('Ajustando descanso…');
    expect(phaseForTool('otra', {})).toBe('Trabajando…');
  });
});

describe('isJobStale / effectiveJobView', () => {
  const base = { id: 'j', userId: 1, fullText: 'hola', workoutUpdated: false, createdAt: 0 };
  it('solo caducan los jobs en curso tras más de 3 min sin actividad', () => {
    expect(isJobStale({ status: 'streaming', createdAt: 0, updatedAt: 1000 }, 1000 + STALE_JOB_MS)).toBe(false);
    expect(isJobStale({ status: 'streaming', createdAt: 0, updatedAt: 1000 }, 1001 + STALE_JOB_MS)).toBe(true);
    expect(isJobStale({ status: 'pending', createdAt: 0 }, STALE_JOB_MS + 1)).toBe(true);
    expect(isJobStale({ status: 'done', createdAt: 0 }, 10 * STALE_JOB_MS)).toBe(false);
    expect(isJobStale({ status: 'error', createdAt: 0 }, 10 * STALE_JOB_MS)).toBe(false);
  });
  it('un job caducado se informa como error y conserva el texto', () => {
    const v = effectiveJobView({ ...base, status: 'streaming', updatedAt: 0, phase: 'Escribiendo…' }, STALE_JOB_MS + 1);
    expect(v.status).toBe('error');
    expect(v.error).toBe('La respuesta se interrumpió. Inténtalo de nuevo.');
    expect(v.fullText).toBe('hola');
    expect(v.phase).toBeUndefined();
  });
  it('un job activo expone su fase y uno terminado no', () => {
    expect(effectiveJobView({ ...base, status: 'streaming', updatedAt: 10, phase: 'Pensando…' }, 20).phase).toBe('Pensando…');
    expect(effectiveJobView({ ...base, status: 'done', updatedAt: 10, phase: 'Pensando…' }, 20).phase).toBeUndefined();
  });
});

describe('quickReplies', () => {
  it('parseQuickReplies tolera valores inválidos', () => {
    expect(parseQuickReplies('["Sí","No"]')).toEqual(['Sí', 'No']);
    expect(parseQuickReplies('{"a":1}')).toBeUndefined();
    expect(parseQuickReplies('no json')).toBeUndefined();
    expect(parseQuickReplies(null)).toBeUndefined();
    expect(parseQuickReplies('[]')).toBeUndefined();
  });
  it('solo se exponen cuando el job está terminado', () => {
    const base = { id: 'j', userId: 1, fullText: 'x', workoutUpdated: false, createdAt: 0, updatedAt: 10, quickReplies: ['Sí', 'No'] };
    expect(effectiveJobView({ ...base, status: 'done' }, 20).quickReplies).toEqual(['Sí', 'No']);
    expect(effectiveJobView({ ...base, status: 'streaming' }, 20).quickReplies).toBeUndefined();
  });
});

describe('decideJobRun (reentregas de la cola)', () => {
  const job = (o: any) => ({ status: 'pending', fullText: '', workoutUpdated: false, ...o });
  it('omite jobs inexistentes o ya resueltos', () => {
    expect(decideJobRun(undefined)).toBe('skip');
    expect(decideJobRun(job({ status: 'done' }))).toBe('skip');
    expect(decideJobRun(job({ status: 'error' }))).toBe('skip');
  });
  it('ejecuta si no hubo progreso', () => {
    expect(decideJobRun(job({}))).toBe('run');
    expect(decideJobRun(job({ status: 'streaming', fullText: '  ' }))).toBe('run');
  });
  it('aborta si ya hubo herramientas o texto', () => {
    expect(decideJobRun(job({ workoutUpdated: true }))).toBe('abort');
    expect(decideJobRun(job({ status: 'streaming', fullText: 'Voy a…' }))).toBe('abort');
  });
});

describe('chatGPT schema requestId', () => {
  it('requestId es opcional', () => {
    const shape = chatGPT.shape as any;
    expect(shape.requestId.safeParse(undefined).success).toBe(true);
    expect(shape.requestId.safeParse('abc').success).toBe(true);
  });
});

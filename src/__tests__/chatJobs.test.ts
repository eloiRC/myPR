import { describe, it, expect } from 'vitest';
import { normalizeRequestId, shouldFlush, rowToJob } from '../chatJobs';
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
    expect(shouldFlush(1500, 1000, 10)).toBe(false);
    expect(shouldFlush(2000, 1000, 10)).toBe(true);
  });
});

describe('rowToJob', () => {
  it('mapea una fila de D1', () => {
    const job = rowToJob({ id: 'j', UserId: 3, Status: 'done', FullText: 'hola', WorkoutUpdated: 1, Error: null, CreatedAt: 9, RequestId: null });
    expect(job).toMatchObject({ id: 'j', userId: 3, status: 'done', fullText: 'hola', workoutUpdated: true, error: undefined, requestId: undefined });
  });
});

describe('chatGPT schema requestId', () => {
  it('requestId es opcional', () => {
    const shape = chatGPT.shape as any;
    expect(shape.requestId.safeParse(undefined).success).toBe(true);
    expect(shape.requestId.safeParse('abc').success).toBe(true);
  });
});

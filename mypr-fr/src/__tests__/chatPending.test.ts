import { describe, it, expect, beforeEach } from 'vitest';
import {
  pendingKey, parsePending, savePending, loadPending, clearPending, createPollGuard, chatErrorMessage, PENDING_TTL_MS,
} from '../services/chatPending';
import { trimHistory, quickRepliesMessageId, sanitizeQuickReplies, MAX_HISTORY_MESSAGES } from '../utils/chatHelpers';

const pending = { jobId: 'j1', botMessageId: 42, requestId: 'r1', startedAt: 1000 };

describe('persistencia del job en curso', () => {
  beforeEach(() => localStorage.clear());

  it('clave por entreno', () => {
    expect(pendingKey(7)).toBe('mypr_chat_pending:7');
  });

  it('guarda, carga y borra', () => {
    savePending(7, { ...pending, startedAt: Date.now() });
    expect(loadPending(7)?.jobId).toBe('j1');
    expect(loadPending(8)).toBeNull();
    clearPending(7);
    expect(loadPending(7)).toBeNull();
  });

  it('descarta y limpia registros corruptos o caducados', () => {
    localStorage.setItem(pendingKey(1), '{no json');
    expect(loadPending(1)).toBeNull();
    expect(localStorage.getItem(pendingKey(1))).toBeNull();
    localStorage.setItem(pendingKey(2), JSON.stringify({ jobId: 'x' }));
    expect(loadPending(2)).toBeNull();
    savePending(3, pending);
    expect(loadPending(3, pending.startedAt + PENDING_TTL_MS + 1)).toBeNull();
    expect(parsePending(JSON.stringify(pending), pending.startedAt + 1000)).toEqual(pending);
  });

  it('no falla si localStorage lanza', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } },
    });
    try {
      expect(() => savePending(1, pending)).not.toThrow();
      expect(loadPending(1)).toBeNull();
      expect(() => clearPending(1)).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', original);
    }
  });
});

describe('guarda de un único bucle de polling', () => {
  it('rechaza un segundo bucle mientras hay uno activo', () => {
    const g = createPollGuard();
    const a = g.start();
    expect(a).not.toBeNull();
    expect(g.start()).toBeNull();
    expect(g.busy).toBe(true);
    g.stop(a!);
    expect(g.busy).toBe(false);
    expect(g.start()).not.toBeNull();
  });

  it('cancelar invalida el token y un stop antiguo no libera al nuevo', () => {
    const g = createPollGuard();
    const a = g.start()!;
    g.cancel();
    expect(g.isCurrent(a)).toBe(false);
    const b = g.start()!;
    g.stop(a);
    expect(g.isCurrent(b)).toBe(true);
  });
});

describe('mensajes de error del job', () => {
  it('muestra el aviso de interrupción del servidor y oculta errores técnicos', () => {
    expect(chatErrorMessage('La respuesta se interrumpió. Inténtalo de nuevo.')).toContain('La respuesta se interrumpió');
    expect(chatErrorMessage('Anthropic 500 boom')).toContain('no ha podido responder');
    expect(chatErrorMessage(undefined)).toContain('no ha podido responder');
  });
});

describe('trimHistory', () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant', content: `m${i}` }));
  it('deja como mucho 10 mensajes y empieza por usuario', () => {
    const out = trimHistory(mk(40));
    expect(out.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES);
    expect(out[0].role).toBe('user');
    expect(out[out.length - 1].content).toBe('m39');
  });
  it('descarta asistentes iniciales tras el recorte', () => {
    const out = trimHistory(mk(41)); // últimos 10 empiezan en m31 (asistente)
    expect(out[0].role).toBe('user');
    expect(out).toHaveLength(9);
  });
  it('no toca historiales cortos y devuelve vacío si no hay usuario', () => {
    expect(trimHistory(mk(4))).toHaveLength(4);
    expect(trimHistory([{ role: 'assistant', content: 'hola' }])).toEqual([]);
  });
});

describe('quickRepliesMessageId', () => {
  const bot = (id: number, quickReplies?: string[]) => ({ id, isUser: false, quickReplies });
  const user = (id: number) => ({ id, isUser: true });
  it('solo el último mensaje del bot con opciones', () => {
    expect(quickRepliesMessageId([user(1), bot(2, ['Sí', 'No'])], false)).toBe(2);
    expect(quickRepliesMessageId([bot(1, ['Sí', 'No']), user(2), bot(3)], false)).toBeNull();
  });
  it('desaparecen al enviar algo o mientras carga', () => {
    expect(quickRepliesMessageId([bot(1, ['Sí', 'No']), user(2)], false)).toBeNull();
    expect(quickRepliesMessageId([bot(1, ['Sí', 'No'])], true)).toBeNull();
    expect(quickRepliesMessageId([], false)).toBeNull();
    expect(quickRepliesMessageId([bot(1, [])], false)).toBeNull();
  });
  it('sanitizeQuickReplies filtra basura y limita a 4', () => {
    expect(sanitizeQuickReplies(['a', ' ', 3, 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c', 'd']);
    expect(sanitizeQuickReplies(null)).toBeUndefined();
    expect(sanitizeQuickReplies([])).toBeUndefined();
  });
});

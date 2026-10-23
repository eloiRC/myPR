import { describe, it, expect } from 'vitest';
import { convertHistory } from '../llm/history';
import { chatGPT } from '../schema';

describe('convertHistory', () => {
  it('convierte el formato antiguo de Gemini (model -> assistant)', () => {
    const out = convertHistory([
      { role: 'user', parts: [{ text: 'hola' }] },
      { role: 'model', parts: [{ text: 'qué tal' }, { text: ' amigo' }] },
    ]);
    expect(out).toEqual([
      { role: 'user', text: 'hola' },
      { role: 'assistant', text: 'qué tal amigo', toolCalls: [] },
    ]);
  });

  it('acepta el formato nuevo y mezclas de ambos', () => {
    const out = convertHistory([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', parts: [{ text: 'c' }] },
    ]);
    expect(out.map(m => m.role)).toEqual(['user', 'assistant', 'user']);
  });

  it('descarta entradas inválidas o vacías y no-array', () => {
    expect(convertHistory(undefined)).toEqual([]);
    expect(convertHistory('x')).toEqual([]);
    expect(convertHistory([null, { role: 'system', content: 'x' }, { role: 'user', content: '  ' }, { role: 'user' }])).toEqual([]);
  });

  it('empieza siempre por usuario y fusiona turnos consecutivos del mismo rol', () => {
    const out = convertHistory([
      { role: 'assistant', content: 'saludo inicial' },
      { role: 'user', content: 'uno' },
      { role: 'user', content: 'dos' },
      { role: 'assistant', content: 'ok' },
    ]);
    expect(out[0]).toEqual({ role: 'user', text: 'uno\n\ndos' });
    expect(out).toHaveLength(2);
  });

  it('recorta a los últimos 10 mensajes y empieza por usuario', () => {
    const raw = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` }));
    const out = convertHistory(raw);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out[0].role).toBe('user');
    // últimos 10 = m70..m79 (m70 es de usuario)
    expect(out[out.length - 1]).toMatchObject({ role: 'assistant', text: 'm79' });
    // si el recorte cae en un asistente, se descarta hasta el primer usuario
    const odd = convertHistory(raw.slice(0, 79));
    expect(odd[0].role).toBe('user');
    expect(odd.length).toBeLessThanOrEqual(10);
  });
});

describe('schema chatGPT: history', () => {
  const base = {
    message: 'hola',
    currentTraining: { entreno: { EntrenoId: 1, UserId: 1, Data: 1, CargaTotal: 0, Nom: 'Entreno #1' } },
  };
  it('acepta formato nuevo y antiguo', () => {
    expect(chatGPT.safeParse({ ...base, history: [{ role: 'user', content: 'x' }, { role: 'assistant', content: 'y' }] }).success).toBe(true);
    expect(chatGPT.safeParse({ ...base, history: [{ role: 'user', parts: [{ text: 'x' }] }, { role: 'model', parts: [{ text: 'y' }] }] }).success).toBe(true);
  });
  it('rechaza roles desconocidos', () => {
    expect(chatGPT.safeParse({ ...base, history: [{ role: 'system', content: 'x' }] }).success).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import type { LlmMessage, LlmProvider, LlmTurn, LlmInput } from '../llm/types';
import { EMPTY_USAGE, addUsage, formatUsage } from '../llm/types';
import {
  toAnthropicMessages, toAnthropicSystem, toAnthropicTools, mapAnthropicStopReason, mapAnthropicUsage,
} from '../llm/anthropicConvert';
import {
  toOpenAiMessages, toOpenAiTools, accumulateToolCallDeltas, finalizeToolCalls, mapOpenAiFinishReason, mapOpenAiUsage,
  type ToolCallAccumulator,
} from '../llm/openaiConvert';
import { resolveProviderConfig } from '../llm/config';
import { runToolLoop, executeToolCalls, closingNote, MAX_TOOL_ITERATIONS } from '../llm/loop';

const conversation: LlmMessage[] = [
  { role: 'user', text: 'añade 3 series de banca' },
  {
    role: 'assistant', text: 'Voy.',
    toolCalls: [
      { id: 'call_1', name: 'add_sets', args: { sets: [{ exerciseId: 1, kg: 80, reps: 8 }] } },
      { id: 'call_2', name: 'update_workout', args: { name: 'Pecho' } },
    ],
  },
  {
    role: 'tool_results',
    results: [
      { id: 'call_1', content: '{"added":[]}', isError: false },
      { id: 'call_2', content: '{"error":"x"}', isError: true },
    ],
  },
];

describe('adaptador Anthropic: conversión', () => {
  it('convierte usuario, tool_use y UN solo mensaje con todos los tool_result', () => {
    const out = toAnthropicMessages(conversation);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ role: 'user', content: 'añade 3 series de banca' });
    expect(out[1].role).toBe('assistant');
    const blocks = out[1].content as any[];
    expect(blocks[0]).toEqual({ type: 'text', text: 'Voy.' });
    expect(blocks[1]).toEqual({ type: 'tool_use', id: 'call_1', name: 'add_sets', input: { sets: [{ exerciseId: 1, kg: 80, reps: 8 }] } });
    expect(out[2].role).toBe('user');
    const results = out[2].content as any[];
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ type: 'tool_result', tool_use_id: 'call_1', content: '{"added":[]}' });
    expect(results[1]).toMatchObject({ tool_use_id: 'call_2', is_error: true });
  });

  it('reenvía intacto el contenido nativo (thinking) si existe', () => {
    const native = [{ type: 'thinking', thinking: 'x', signature: 's' }, { type: 'tool_use', id: 't', name: 'delete_set', input: { serieId: 1 } }];
    const out = toAnthropicMessages([{ role: 'assistant', text: '', toolCalls: [], providerData: native }]);
    expect(out[0].content).toBe(native);
  });

  it('omite mensajes vacíos', () => {
    expect(toAnthropicMessages([{ role: 'user', text: '  ' }, { role: 'assistant', text: '', toolCalls: [] }])).toEqual([]);
  });

  it('system: estable con cache_control primero, volátil después sin él', () => {
    const sys = toAnthropicSystem({ stable: 'STABLE', volatile: 'VOL' });
    expect(sys[0]).toEqual({ type: 'text', text: 'STABLE', cache_control: { type: 'ephemeral' } });
    expect(sys[1]).toEqual({ type: 'text', text: 'VOL' });
  });

  it('tools: strict e input_schema', () => {
    const t = toAnthropicTools([{ name: 'a', description: 'd', parameters: { type: 'object' } }]);
    expect(t[0]).toEqual({ name: 'a', description: 'd', strict: true, input_schema: { type: 'object' } });
  });

  it('stop reasons y usage', () => {
    expect(mapAnthropicStopReason('tool_use')).toBe('tool_use');
    expect(mapAnthropicStopReason('max_tokens')).toBe('max_tokens');
    expect(mapAnthropicStopReason('refusal')).toBe('refusal');
    expect(mapAnthropicStopReason('end_turn')).toBe('end');
    expect(mapAnthropicUsage({ input_tokens: 5, output_tokens: 7, cache_read_input_tokens: 100, cache_creation_input_tokens: 20 }))
      .toEqual({ inputTokens: 5, outputTokens: 7, cacheReadTokens: 100, cacheWriteTokens: 20 });
  });
});

describe('adaptador OpenAI: conversión', () => {
  it('system estable primero, luego volátil; tool_calls y un mensaje tool por resultado', () => {
    const out = toOpenAiMessages({ stable: 'STABLE', volatile: 'VOL' }, conversation);
    expect(out[0]).toEqual({ role: 'system', content: 'STABLE' });
    expect(out[1]).toEqual({ role: 'system', content: 'VOL' });
    expect(out[2]).toEqual({ role: 'user', content: 'añade 3 series de banca' });
    const a = out[3] as any;
    expect(a.role).toBe('assistant');
    expect(a.content).toBe('Voy.');
    expect(a.tool_calls[0]).toEqual({
      id: 'call_1', type: 'function',
      function: { name: 'add_sets', arguments: JSON.stringify({ sets: [{ exerciseId: 1, kg: 80, reps: 8 }] }) },
    });
    expect(out[4]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: '{"added":[]}' });
    expect((out[5] as any).tool_call_id).toBe('call_2');
    expect((out[5] as any).content).toContain('ERROR');
    expect(out).toHaveLength(6);
  });

  it('asistente solo con tool calls lleva content null', () => {
    const out = toOpenAiMessages({ stable: 's', volatile: 'v' }, [
      { role: 'assistant', text: '', toolCalls: [{ id: 'c', name: 'delete_set', args: { serieId: 1 } }] },
    ]);
    expect((out[2] as any).content).toBeNull();
  });

  it('el prefijo estable es idéntico entre peticiones con volátil distinto', () => {
    const a = toOpenAiMessages({ stable: 'S', volatile: 'v1' }, []);
    const b = toOpenAiMessages({ stable: 'S', volatile: 'v2' }, [{ role: 'user', text: 'x' }]);
    expect(a[0]).toEqual(b[0]);
  });

  it('tools como function sin strict', () => {
    const t = toOpenAiTools([{ name: 'a', description: 'd', parameters: { type: 'object' } }]);
    expect(t[0]).toEqual({ type: 'function', function: { name: 'a', description: 'd', parameters: { type: 'object' } } });
  });

  it('acumula deltas de tool_calls por índice y parsea con guarda', () => {
    const acc: ToolCallAccumulator = new Map();
    accumulateToolCallDeltas(acc, [{ index: 0, id: 'c0', function: { name: 'add_sets', arguments: '{"sets":' } }]);
    accumulateToolCallDeltas(acc, [{ index: 1, id: 'c1', function: { name: 'delete_set', arguments: '{"serie' } }]);
    accumulateToolCallDeltas(acc, [{ index: 0, function: { arguments: '[]}' } }]);
    accumulateToolCallDeltas(acc, [{ index: 1, function: { arguments: 'Id": 3' } }]); // JSON sin cerrar
    const calls = finalizeToolCalls(acc);
    expect(calls[0]).toEqual({ id: 'c0', name: 'add_sets', args: { sets: [] } });
    expect(calls[1].id).toBe('c1');
    expect(calls[1].args).toBeUndefined();
    expect(calls[1].argsError).toBeTruthy();
  });

  it('finish reasons y usage normalizado (prompt_tokens incluye lo cacheado)', () => {
    expect(mapOpenAiFinishReason('tool_calls')).toBe('tool_use');
    expect(mapOpenAiFinishReason('length')).toBe('max_tokens');
    expect(mapOpenAiFinishReason('content_filter')).toBe('refusal');
    expect(mapOpenAiFinishReason('stop', true)).toBe('refusal');
    expect(mapOpenAiFinishReason('stop')).toBe('end');
    expect(mapOpenAiUsage({ prompt_tokens: 1200, completion_tokens: 30, prompt_tokens_details: { cached_tokens: 1000 } }))
      .toEqual({ inputTokens: 200, outputTokens: 30, cacheReadTokens: 1000, cacheWriteTokens: 0 });
    expect(mapOpenAiUsage(undefined)).toEqual(EMPTY_USAGE);
  });
});

describe('selección de proveedor', () => {
  it('por defecto anthropic con claude-haiku-5-5', () => {
    expect(resolveProviderConfig({ ANTHROPIC_API_KEY: 'k' })).toEqual({ provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'k' });
  });
  it('openai con gpt-6-luna y override de modelo', () => {
    expect(resolveProviderConfig({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'o' })).toEqual({ provider: 'openai', model: 'gpt-6-luna', apiKey: 'o' });
    expect(resolveProviderConfig({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'o', LLM_MODEL: 'otro' }).model).toBe('otro');
  });
  it('falta la clave: error en español', () => {
    expect(() => resolveProviderConfig({})).toThrow(/ANTHROPIC_API_KEY/);
    expect(() => resolveProviderConfig({ LLM_PROVIDER: 'openai' })).toThrow(/OPENAI_API_KEY/);
    expect(() => resolveProviderConfig({ LLM_PROVIDER: 'gemini' })).toThrow(/no válido/);
  });
});

describe('formato de uso', () => {
  it('es idéntico para ambos proveedores e incluye tokens cacheados', () => {
    const u = { inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 };
    expect(formatUsage('anthropic', 'm', u)).toBe('[coach-usage] provider=anthropic model=m input_tokens=1 output_tokens=2 cache_read_input_tokens=3 cache_creation_input_tokens=4');
    expect(addUsage(u, u).cacheReadTokens).toBe(6);
  });
});

// ---- Bucle de herramientas con proveedor falso ----

function fakeProvider(turns: Partial<LlmTurn>[], seen: LlmInput[] = []): LlmProvider {
  let i = 0;
  return {
    name: 'anthropic', model: 'fake',
    async runTurn(input, onText) {
      seen.push({ ...input, messages: [...input.messages] });
      const t = turns[Math.min(i++, turns.length - 1)];
      if (t.text) onText(t.text);
      const text = t.text ?? '';
      const toolCalls = t.toolCalls ?? [];
      return {
        text, toolCalls, stopReason: t.stopReason ?? 'end',
        usage: t.usage ?? { inputTokens: 10, outputTokens: 5, cacheReadTokens: 100, cacheWriteTokens: 0 },
        assistant: { role: 'assistant', text, toolCalls },
      };
    },
  };
}
const baseInput = { system: { stable: 's', volatile: 'v' }, messages: [{ role: 'user', text: 'hola' } as LlmMessage], tools: [], maxTokens: 8000 };

describe('runToolLoop', () => {
  it('ejecuta todas las tool calls y devuelve UN mensaje con todos los resultados', async () => {
    const seen: LlmInput[] = [];
    const exec: string[] = [];
    const provider = fakeProvider([
      { text: 'Añadiendo.', stopReason: 'tool_use', toolCalls: [{ id: 'a', name: 'add_sets', args: {} }, { id: 'b', name: 'update_workout', args: {} }] },
      { text: 'Listo.', stopReason: 'end' },
    ], seen);
    const streamed: string[] = [];
    const r = await runToolLoop({
      provider, input: baseInput, onText: d => streamed.push(d),
      exec: async c => { exec.push(c.name); return { content: '{"ok":true}', isError: false }; },
    });
    expect(exec).toEqual(['add_sets', 'update_workout']);
    expect(r.iterations).toBe(2);
    expect(r.stopReason).toBe('end');
    expect(r.text).toBe('Añadiendo.\n\nListo.');
    expect(streamed.join('')).toBe(r.text);
    expect(r.usage.cacheReadTokens).toBe(200);
    // el segundo turno recibe asistente + un único tool_results con los dos resultados
    const second = seen[1].messages;
    expect(second.map(m => m.role)).toEqual(['user', 'assistant', 'tool_results']);
    expect((second[2] as any).results).toHaveLength(2);
  });

  it('un fallo de herramienta se devuelve como error, sin romper el bucle', async () => {
    const msg = await executeToolCalls(
      [{ id: 'x', name: 't', args: {} }, { id: 'y', name: 't', args: undefined, argsError: 'JSON roto' }],
      async () => { throw new Error('boom'); },
    );
    const res = (msg as any).results;
    expect(res[0]).toMatchObject({ id: 'x', isError: true });
    expect(res[1]).toMatchObject({ id: 'y', isError: true });
    expect(res[1].content).toContain('JSON roto');
  });

  it('corta en 5 iteraciones', async () => {
    const provider = fakeProvider([{ stopReason: 'tool_use', toolCalls: [{ id: 'a', name: 't', args: {} }] }]);
    let n = 0;
    const r = await runToolLoop({ provider, input: baseInput, onText: () => {}, exec: async () => { n++; return { content: '{}', isError: false }; } });
    expect(r.iterations).toBe(MAX_TOOL_ITERATIONS);
    expect(n).toBe(MAX_TOOL_ITERATIONS);
    expect(r.stopReason).toBe('iteration_cap');
    expect(r.text).toContain('límite de acciones');
  });

  it('max_tokens no ejecuta tool calls truncadas y avisa', async () => {
    let ran = false;
    const provider = fakeProvider([{ text: 'Plan...', stopReason: 'max_tokens', toolCalls: [{ id: 'a', name: 't', args: {} }] }]);
    const r = await runToolLoop({ provider, input: baseInput, onText: () => {}, exec: async () => { ran = true; return { content: '{}', isError: false }; } });
    expect(ran).toBe(false);
    expect(r.stopReason).toBe('max_tokens');
    expect(r.text).toContain('cortada');
  });

  it('refusal: no ejecuta herramientas y da mensaje si no hay texto', async () => {
    const provider = fakeProvider([{ stopReason: 'refusal', toolCalls: [{ id: 'a', name: 't', args: {} }] }]);
    let ran = false;
    const r = await runToolLoop({ provider, input: baseInput, onText: () => {}, exec: async () => { ran = true; return { content: '{}', isError: false }; } });
    expect(ran).toBe(false);
    expect(r.text).toContain('No puedo');
    expect(closingNote('end', 'x')).toBe('');
  });
});

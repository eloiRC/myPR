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
import { resolveProviderConfig, resolveModelConfig, modelAvailable } from '../llm/config';
import { MODEL_CATALOG } from '../llm/models';
import { openRouterProvider, acumularRazonamiento } from '../llm/openai';
import { parseToolArgs, TOOL_USE_REMINDER } from '../llm/openaiConvert';
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
    expect(resolveProviderConfig({ ANTHROPIC_API_KEY: 'k' })).toEqual({ provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'k', thinking: 'adaptive' });
  });
  it('openai con gpt-6-luna y override de modelo', () => {
    expect(resolveProviderConfig({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'o' })).toEqual({ provider: 'openai', model: 'gpt-6-luna', apiKey: 'o', thinking: 'adaptive' });
    expect(resolveProviderConfig({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'o', LLM_MODEL: 'otro' }).model).toBe('otro');
  });
  it('LLM_THINKING=off desactiva el razonamiento previo', () => {
    expect(resolveProviderConfig({ ANTHROPIC_API_KEY: 'k', LLM_THINKING: 'off' }).thinking).toBe('off');
    expect(resolveProviderConfig({ ANTHROPIC_API_KEY: 'k', LLM_THINKING: 'loquesea' }).thinking).toBe('adaptive');
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

  it('onPhase: pensando por turno, escribiendo al primer texto y herramienta antes de ejecutarla', async () => {
    const events: string[] = [];
    const provider = fakeProvider([
      { text: 'Añado.', stopReason: 'tool_use', toolCalls: [{ id: 'a', name: 'add_sets', args: {} }] },
      { text: 'Listo.', stopReason: 'end' },
    ]);
    await runToolLoop({
      provider, input: baseInput, onText: () => {},
      onPhase: async e => { events.push(e.type === 'tool' ? `tool:${e.call.name}` : e.type); },
      exec: async c => { events.push(`exec:${c.name}`); return { content: '{}', isError: false }; },
    });
    expect(events).toEqual(['thinking', 'writing', 'tool:add_sets', 'exec:add_sets', 'thinking', 'writing']);
  });

  it('onPhase que falla no rompe la generación', async () => {
    const provider = fakeProvider([{ text: 'Hola.', stopReason: 'end' }]);
    const r = await runToolLoop({ provider, input: baseInput, onText: () => {}, onPhase: () => { throw new Error('D1 caído'); }, exec: async () => ({ content: '{}', isError: false }) });
    expect(r.text).toBe('Hola.');
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

describe('modelo elegido por el usuario', () => {
  it('sin elección o desconocido: usa el por defecto o el del entorno', () => {
    expect(resolveModelConfig({ ANTHROPIC_API_KEY: 'k' }, null).model).toBe('claude-haiku-5-5');
    expect(resolveModelConfig({ ANTHROPIC_API_KEY: 'k' }, 'no-existe').model).toBe('claude-haiku-5-5');
  });
  it('catálogo reducido: Haiku, Luna, Sol low, Grok 4.7 y DeepSeek Flash', () => {
    expect(MODEL_CATALOG.map(m => m.id)).toEqual(['claude-haiku-5-5', 'gpt-6-luna', 'gpt-6.1-sol-low', 'grok-4.7', 'deepseek-v4.1-flash']);
  });
  it('Haiku va directo y adaptativo con tope medio aunque el global esté apagado', () => {
    expect(resolveModelConfig({ ANTHROPIC_API_KEY: 'a', LLM_THINKING: 'off' }, 'claude-haiku-5-5')).toMatchObject({ provider: 'anthropic', thinking: 'adaptive', effort: 'medium', apiKey: 'a' });
  });
  it('OpenRouter: Luna al máximo, Sol bajo y DeepSeek automático con su enrutado', () => {
    const env = { OPENROUTER_API_KEY: 'o' };
    expect(resolveModelConfig(env, 'gpt-6-luna')).toMatchObject({ provider: 'openrouter', model: 'openai/gpt-6-luna', effort: 'high', routing: { order: ['OpenAI'] } });
    expect(resolveModelConfig(env, 'gpt-6.1-sol-low')).toMatchObject({ model: 'openai/gpt-6.1-sol', effort: 'low' });
    expect(resolveModelConfig(env, 'grok-4.7')).toMatchObject({ provider: 'openrouter', model: 'x-ai/grok-4.7', effort: 'auto' });
    const ds = resolveModelConfig(env, 'deepseek-v4.1-flash');
    expect(ds).toMatchObject({ effort: 'auto', routing: { minThroughput: 60, maxLatency: 3 } });
    expect(ds.routing?.quantizations).not.toContain('fp4');
  });
  it('sin la clave del proveedor: error en español', () => {
    expect(() => resolveModelConfig({ ANTHROPIC_API_KEY: 'a' }, 'gpt-6-luna')).toThrow(/OPENROUTER_API_KEY/);
  });
  it('disponibilidad según las claves presentes', () => {
    expect(modelAvailable({ ANTHROPIC_API_KEY: 'a' }, 'claude-haiku-5-5')).toBe(true);
    expect(modelAvailable({ ANTHROPIC_API_KEY: 'a' }, 'gpt-6-luna')).toBe(false);
    expect(modelAvailable({ OPENROUTER_API_KEY: 'o' }, 'deepseek-v4.1-flash')).toBe(true);
    expect(modelAvailable({ OPENROUTER_API_KEY: 'o' }, 'grok-4.3')).toBe(false);
  });
  it('el objeto provider de OpenRouter siempre exige herramientas', () => {
    expect(openRouterProvider()).toEqual({ require_parameters: true, allow_fallbacks: true });
    expect(openRouterProvider({ minThroughput: 60, maxLatency: 3, quantizations: ['fp8'] })).toMatchObject({ preferred_min_throughput: 60, preferred_max_latency: 3, quantizations: ['fp8'] });
  });
  it('los ids del catálogo son únicos', () => {
    const ids = MODEL_CATALOG.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('herramientas por OpenRouter: tolerancia', () => {
  it('lee argumentos con bloque json, texto alrededor o doble codificación', () => {
    expect(parseToolArgs('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseToolArgs('Aquí va: {"a":2} listo')).toEqual({ a: 2 });
    expect(parseToolArgs(JSON.stringify(JSON.stringify({ a: 3 })))).toEqual({ a: 3 });
    expect(() => parseToolArgs('nada')).toThrow();
  });
  it('acumula llamadas sin index y nombres repetidos completos', () => {
    const acc: ToolCallAccumulator = new Map();
    accumulateToolCallDeltas(acc, [{ id: 'c1', function: { name: 'add_sets', arguments: '{"sets":' } }]);
    accumulateToolCallDeltas(acc, [{ function: { name: 'add_sets', arguments: '[]}' } }]);
    accumulateToolCallDeltas(acc, [{ id: 'c2', function: { name: 'suggest_replies', arguments: '{}' } }]);
    const calls = finalizeToolCalls(acc);
    expect(calls.map(c => [c.id, c.name])).toEqual([['c1', 'add_sets'], ['c2', 'suggest_replies']]);
    expect(calls[0].args).toEqual({ sets: [] });
  });
  it('con herramientas pedidas, un "stop" cuenta como tool_use (salvo corte por longitud)', () => {
    expect(mapOpenAiFinishReason('stop', false, true)).toBe('tool_use');
    expect(mapOpenAiFinishReason(null, false, true)).toBe('tool_use');
    expect(mapOpenAiFinishReason('length', false, true)).toBe('max_tokens');
    expect(mapOpenAiFinishReason('stop', false, false)).toBe('end');
  });
  it('devuelve reasoning_details en el turno siguiente y añade el recordatorio solo si se pide', () => {
    const msgs = toOpenAiMessages({ stable: 'S', volatile: 'V' }, [
      { role: 'assistant', text: '', toolCalls: [{ id: 'x', name: 'a', args: {} }], providerData: { reasoning_details: [{ type: 'reasoning.text', text: 'pienso' }] } },
    ], { toolReminder: true });
    expect((msgs[0] as any).content).toContain(TOOL_USE_REMINDER);
    expect((msgs[2] as any).reasoning_details).toEqual([{ type: 'reasoning.text', text: 'pienso' }]);
    expect((toOpenAiMessages({ stable: 'S', volatile: 'V' }, [])[0] as any).content).toBe('S');
  });
  it('une los trozos de razonamiento por índice', () => {
    const acc = new Map<number, Record<string, unknown>>();
    acumularRazonamiento(acc, [{ type: 'reasoning.text', index: 0, text: 'ho' }]);
    acumularRazonamiento(acc, [{ index: 0, text: 'la', signature: 'sig' }]);
    expect(Array.from(acc.values())).toEqual([{ type: 'reasoning.text', index: 0, text: 'hola', signature: 'sig' }]);
  });
});

describe('entrevista', () => {
  it('solo ofrece herramientas de memoria y respuestas rápidas', async () => {
    const { INTERVIEW_TOOL_DEFS, INTERVIEW_PERSONA, buildInterviewContext } = await import('../coachInterview');
    expect(INTERVIEW_TOOL_DEFS.map(t => t.name).sort()).toEqual(['delete_memory', 'save_memory', 'suggest_replies', 'update_memory']);
    expect(INTERVIEW_PERSONA).toContain('suggest_replies');
    expect(buildInterviewContext({ dateLabel: '1/11/2026', nowSec: 0, memories: [] })).toContain('entrevista');
  });
});

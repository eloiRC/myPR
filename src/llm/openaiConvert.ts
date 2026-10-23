// Conversión neutral <-> OpenAI Chat Completions. Pura, sin red.
import type { LlmInput, LlmMessage, LlmStopReason, LlmToolCall, LlmToolDef, LlmUsage } from './types';

export type OpenAiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

/**
 * El texto estable va PRIMERO y sin cambios: el prompt caching de OpenAI es automático por prefijo.
 * Lo volátil va después, en un segundo mensaje de sistema.
 */
export function toOpenAiMessages(system: LlmInput['system'], messages: LlmMessage[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [
    { role: 'system', content: system.stable },
    { role: 'system', content: system.volatile },
  ];
  for (const m of messages) {
    if (m.role === 'user') {
      if (m.text.trim()) out.push({ role: 'user', content: m.text });
    } else if (m.role === 'assistant') {
      if (!m.text.trim() && m.toolCalls.length === 0) continue;
      const msg: OpenAiMessage = { role: 'assistant', content: m.text.trim() ? m.text : null };
      if (m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: JSON.stringify(tc.args ?? {}) },
        }));
      }
      out.push(msg);
    } else {
      // Un mensaje role:'tool' por cada resultado
      for (const r of m.results) {
        out.push({ role: 'tool', tool_call_id: r.id, content: r.isError ? `ERROR: ${r.content}` : r.content });
      }
    }
  }
  return out;
}

export function toOpenAiTools(tools: LlmToolDef[]) {
  // Sin strict: el modo estricto de OpenAI exige todos los campos required; validamos con zod en el servidor.
  return tools.map(t => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export function mapOpenAiFinishReason(reason: string | null | undefined, sawRefusal = false): LlmStopReason {
  if (sawRefusal || reason === 'content_filter') return 'refusal';
  if (reason === 'tool_calls' || reason === 'function_call') return 'tool_use';
  if (reason === 'length') return 'max_tokens';
  return 'end';
}

export function mapOpenAiUsage(u: any): LlmUsage {
  const prompt = u?.prompt_tokens ?? 0;
  const cached = u?.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    // prompt_tokens incluye lo cacheado: se normaliza a "no cacheado" como hace Anthropic
    inputTokens: Math.max(0, prompt - cached),
    outputTokens: u?.completion_tokens ?? 0,
    cacheReadTokens: cached,
    cacheWriteTokens: 0, // OpenAI no cobra ni reporta escritura de caché
  };
}

export interface ToolCallDelta {
  index: number;
  id?: string | null;
  function?: { name?: string | null; arguments?: string | null } | null;
}

export type ToolCallAccumulator = Map<number, { id: string; name: string; args: string }>;

/** Acumula los deltas de tool_calls por índice. */
export function accumulateToolCallDeltas(acc: ToolCallAccumulator, deltas: ToolCallDelta[] | undefined | null) {
  for (const d of deltas ?? []) {
    const cur = acc.get(d.index) ?? { id: '', name: '', args: '' };
    if (d.id) cur.id = d.id;
    if (d.function?.name) cur.name += d.function.name;
    if (d.function?.arguments) cur.args += d.function.arguments;
    acc.set(d.index, cur);
  }
}

/** Parsea los argumentos acumulados con guarda: un JSON inválido no rompe el bucle. */
export function finalizeToolCalls(acc: ToolCallAccumulator): LlmToolCall[] {
  return Array.from(acc.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([index, c]) => {
      const id = c.id || `call_${index}`;
      if (!c.args.trim()) return { id, name: c.name, args: {} };
      try {
        return { id, name: c.name, args: JSON.parse(c.args) as unknown };
      } catch (e: any) {
        return { id, name: c.name, args: undefined, argsError: e?.message || 'JSON inválido' };
      }
    });
}

// Conversión neutral <-> OpenAI Chat Completions. Pura, sin red.
import type { LlmInput, LlmMessage, LlmStopReason, LlmToolCall, LlmToolDef, LlmUsage } from './types';

export type OpenAiMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
      /** OpenRouter: razonamiento del turno, que hay que devolver tal cual entre llamadas a herramientas */
      reasoning_details?: unknown[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

/**
 * Recordatorio para modelos servidos por OpenRouter: algunos escriben la llamada como texto (JSON en la
 * respuesta) en lugar de usar la función, o se inventan herramientas. Es constante, así que no rompe la caché.
 */
export const TOOL_USE_REMINDER = `USO DE HERRAMIENTAS (obligatorio)
- Para actuar llama a las funciones que tienes disponibles; nunca escribas la llamada ni su JSON en el texto de la respuesta.
- Usa solo las herramientas y parámetros definidos, con los tipos indicados (números como números, no como texto).
- Si una herramienta devuelve un error, léelo, corrige los argumentos y vuelve a llamarla; no digas que algo se hizo si falló.`;

/**
 * El texto estable va PRIMERO y sin cambios: el prompt caching de OpenAI es automático por prefijo.
 * Lo volátil va después, en un segundo mensaje de sistema.
 */
export function toOpenAiMessages(system: LlmInput['system'], messages: LlmMessage[], opts: { toolReminder?: boolean } = {}): OpenAiMessage[] {
  const out: OpenAiMessage[] = [
    { role: 'system', content: opts.toolReminder ? `${system.stable}\n\n${TOOL_USE_REMINDER}` : system.stable },
    { role: 'system', content: system.volatile },
  ];
  for (const m of messages) {
    if (m.role === 'user') {
      if (m.text.trim()) out.push({ role: 'user', content: m.text });
    } else if (m.role === 'assistant') {
      if (!m.text.trim() && m.toolCalls.length === 0) continue;
      const msg: OpenAiMessage = { role: 'assistant', content: m.text.trim() ? m.text : null };
      const rd = (m.providerData as { reasoning_details?: unknown[] } | undefined)?.reasoning_details;
      if (Array.isArray(rd) && rd.length > 0) msg.reasoning_details = rd;
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

export function mapOpenAiFinishReason(reason: string | null | undefined, sawRefusal = false, hasToolCalls = false): LlmStopReason {
  if (sawRefusal || reason === 'content_filter') return 'refusal';
  if (reason === 'tool_calls' || reason === 'function_call') return 'tool_use';
  // Varios proveedores de OpenRouter cierran con "stop" (o sin motivo) aunque hayan pedido herramientas
  if (hasToolCalls && reason !== 'length') return 'tool_use';
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
  index?: number | null;
  id?: string | null;
  function?: { name?: string | null; arguments?: string | null } | null;
}

export type ToolCallAccumulator = Map<number, { id: string; name: string; args: string }>;

/** Acumula los deltas de tool_calls por índice. */
export function accumulateToolCallDeltas(acc: ToolCallAccumulator, deltas: ToolCallDelta[] | undefined | null) {
  for (const d of deltas ?? []) {
    // Algunos proveedores no mandan index: se agrupa por id o, si no, se continúa la última llamada
    let index = typeof d.index === 'number' ? d.index : -1;
    if (index < 0) {
      const porId = d.id ? Array.from(acc.entries()).find(([, c]) => c.id === d.id)?.[0] : undefined;
      index = porId ?? (d.id || acc.size === 0 ? acc.size : acc.size - 1);
    }
    const cur = acc.get(index) ?? { id: '', name: '', args: '' };
    if (d.id) cur.id = d.id;
    const nombre = d.function?.name;
    // Hay proveedores que repiten el nombre completo en cada trozo en vez de enviarlo por partes
    if (nombre && nombre !== cur.name) cur.name = cur.name && !nombre.startsWith(cur.name) ? cur.name + nombre : nombre;
    if (d.function?.arguments) cur.args += d.function.arguments;
    acc.set(index, cur);
  }
}

/**
 * Parsea los argumentos tolerando lo que algunos modelos devuelven: bloque ```json, texto alrededor del
 * objeto, o el JSON codificado dos veces como cadena. Lanza si no hay forma de leerlo.
 */
export function parseToolArgs(raw: string): unknown {
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let v: unknown;
  try {
    v = JSON.parse(s);
  } catch (e) {
    const i = s.indexOf('{'), j = s.lastIndexOf('}');
    if (i < 0 || j <= i) throw e;
    s = s.slice(i, j + 1);
    v = JSON.parse(s);
  }
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { /* era texto de verdad */ }
  }
  return v;
}

/** Parsea los argumentos acumulados con guarda: un JSON inválido no rompe el bucle. */
export function finalizeToolCalls(acc: ToolCallAccumulator): LlmToolCall[] {
  return Array.from(acc.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([index, c]) => {
      const id = c.id || `call_${index}`;
      if (!c.args.trim()) return { id, name: c.name, args: {} };
      try {
        return { id, name: c.name, args: parseToolArgs(c.args) };
      } catch (e: any) {
        return { id, name: c.name, args: undefined, argsError: e?.message || 'JSON inválido' };
      }
    });
}

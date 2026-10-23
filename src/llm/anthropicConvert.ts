// Conversión neutral <-> Anthropic Messages API. Sin dependencia del SDK (tipos estructurales)
// para poder testearla sin red.
import type { LlmInput, LlmMessage, LlmStopReason, LlmToolDef, LlmUsage } from './types';

export type AnthropicBlock = Record<string, unknown> & { type: string };
export interface AnthropicMessage { role: 'user' | 'assistant'; content: string | AnthropicBlock[] }

export function toAnthropicMessages(messages: LlmMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      if (m.text.trim()) out.push({ role: 'user', content: m.text });
    } else if (m.role === 'assistant') {
      // Si viene el contenido nativo (con thinking) se reenvía sin tocar
      if (Array.isArray(m.providerData) && m.providerData.length > 0) {
        out.push({ role: 'assistant', content: m.providerData as AnthropicBlock[] });
        continue;
      }
      const blocks: AnthropicBlock[] = [];
      if (m.text.trim()) blocks.push({ type: 'text', text: m.text });
      for (const tc of m.toolCalls) {
        blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args ?? {} });
      }
      if (blocks.length > 0) out.push({ role: 'assistant', content: blocks });
    } else {
      // UN solo mensaje de usuario con todos los tool_result
      out.push({
        role: 'user',
        content: m.results.map(r => ({
          type: 'tool_result',
          tool_use_id: r.id,
          content: r.content,
          ...(r.isError ? { is_error: true } : {}),
        })),
      });
    }
  }
  return out;
}

export function toAnthropicTools(tools: LlmToolDef[]) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    strict: true,
    input_schema: t.parameters,
  }));
}

/** Bloque estable con breakpoint de caché + bloque volátil después. */
export function toAnthropicSystem(system: LlmInput['system']) {
  return [
    { type: 'text' as const, text: system.stable, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: system.volatile },
  ];
}

export function mapAnthropicStopReason(reason: string | null | undefined): LlmStopReason {
  switch (reason) {
    case 'tool_use': return 'tool_use';
    case 'max_tokens': return 'max_tokens';
    case 'refusal': return 'refusal';
    default: return 'end'; // end_turn, stop_sequence, pause_turn
  }
}

export function mapAnthropicUsage(u: any): LlmUsage {
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    cacheReadTokens: u?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u?.cache_creation_input_tokens ?? 0,
  };
}

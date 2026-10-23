import type { LlmMessage } from './types';

const MAX_HISTORY_MESSAGES = 30;

type HistoryRole = 'user' | 'assistant';

function extractEntry(raw: any): { role: HistoryRole; text: string } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  // Formato antiguo (Gemini): { role: 'user'|'model', parts: [{ text }] }
  // Formato nuevo: { role: 'user'|'assistant', content: string }
  const role: HistoryRole | undefined =
    raw.role === 'user' ? 'user' : (raw.role === 'model' || raw.role === 'assistant') ? 'assistant' : undefined;
  if (!role) return undefined;

  let text = '';
  if (typeof raw.content === 'string') {
    text = raw.content;
  } else if (Array.isArray(raw.parts)) {
    text = raw.parts.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')).join('');
  }
  text = text.trim();
  if (!text) return undefined;
  return { role, text };
}

/**
 * Convierte el historial del cliente (formato Gemini antiguo o nuevo) a mensajes neutrales.
 * Descarta entradas inválidas o vacías, fusiona turnos consecutivos del mismo rol,
 * recorta a los últimos mensajes y garantiza que empiece por un mensaje de usuario.
 */
export function convertHistory(raw: unknown): LlmMessage[] {
  if (!Array.isArray(raw)) return [];

  const merged: { role: HistoryRole; text: string }[] = [];
  for (const item of raw) {
    const e = extractEntry(item);
    if (!e) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === e.role) last.text += `\n\n${e.text}`;
    else merged.push({ ...e });
  }

  let tail = merged.slice(-MAX_HISTORY_MESSAGES);
  while (tail.length > 0 && tail[0].role !== 'user') tail = tail.slice(1);

  return tail.map(m =>
    m.role === 'user'
      ? { role: 'user' as const, text: m.text }
      : { role: 'assistant' as const, text: m.text, toolCalls: [] }
  );
}

// Funciones puras del chat del coach (testeables sin Vue ni red).

/** Máximo de mensajes de historial que se envían al modelo (el borrado diario del chat no cambia). */
export const MAX_HISTORY_MESSAGES = 10;

export interface HistoryEntry {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Recorta el historial a los últimos `max` mensajes y garantiza que empiece por un mensaje de usuario
 * (si el recorte cae en una respuesta del asistente, se descarta hasta el primer mensaje de usuario).
 */
export function trimHistory(history: HistoryEntry[], max = MAX_HISTORY_MESSAGES): HistoryEntry[] {
    let tail = history.slice(-max);
    const firstUser = tail.findIndex(m => m.role === 'user');
    tail = firstUser === -1 ? [] : tail.slice(firstUser);
    return tail;
}

interface ChipMessage {
    id: number;
    isUser: boolean;
    quickReplies?: string[];
}

/**
 * Id del mensaje bajo el que se muestran las respuestas rápidas: solo el último mensaje del chat,
 * si es del bot y tiene opciones, y no hay una respuesta en curso. En cuanto el usuario envía algo,
 * el último mensaje deja de ser del bot y los botones desaparecen.
 */
export function quickRepliesMessageId(messages: ChipMessage[], isLoading: boolean): number | null {
    if (isLoading || messages.length === 0) return null;
    const last = messages[messages.length - 1];
    if (last.isUser || !last.quickReplies || last.quickReplies.length === 0) return null;
    return last.id;
}

/** Normaliza opciones recibidas del servidor o de localStorage: solo textos no vacíos, máximo 4. */
export function sanitizeQuickReplies(raw: unknown): string[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const list = raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim()).slice(0, 4);
    return list.length ? list : undefined;
}

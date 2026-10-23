// Interfaz neutral de proveedor LLM. El bucle de herramientas, las herramientas y la memoria
// solo conocen estos tipos; cada adaptador (anthropic.ts / openai.ts) los convierte a su API.

export interface LlmToolDef {
  name: string;
  description: string;
  /** JSON Schema del input (type: object, additionalProperties: false) */
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  /** Argumentos ya parseados (undefined si el JSON era inválido: ver argsError) */
  args: unknown;
  argsError?: string;
}

export type LlmAssistantMessage = {
  role: 'assistant';
  text: string;
  toolCalls: LlmToolCall[];
  /** Contenido nativo del proveedor (p. ej. bloques thinking de Anthropic) que debe reenviarse intacto */
  providerData?: unknown;
};

export type LlmMessage =
  | { role: 'user'; text: string }
  | LlmAssistantMessage
  | { role: 'tool_results'; results: { id: string; content: string; isError: boolean }[] };

export type LlmStopReason = 'end' | 'tool_use' | 'max_tokens' | 'refusal';

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmInput {
  system: {
    /** Persona y reglas: idéntico byte a byte entre peticiones (se cachea) */
    stable: string;
    /** Contexto por petición: análisis, series de hoy, fecha, memoria */
    volatile: string;
  };
  messages: LlmMessage[];
  tools: LlmToolDef[];
  maxTokens: number;
}

export interface LlmTurn {
  text: string;
  toolCalls: LlmToolCall[];
  stopReason: LlmStopReason;
  usage: LlmUsage;
  /** Mensaje de asistente listo para añadir a la conversación neutral */
  assistant: LlmAssistantMessage;
}

export interface LlmProvider {
  readonly name: 'anthropic' | 'openai';
  readonly model: string;
  runTurn(input: LlmInput, onText: (delta: string) => void): Promise<LlmTurn>;
}

export const EMPTY_USAGE: LlmUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function addUsage(a: LlmUsage, b: LlmUsage): LlmUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

/** Formato único de log de uso para ambos proveedores. */
export function formatUsage(provider: string, model: string, u: LlmUsage): string {
  return `[coach-usage] provider=${provider} model=${model} input_tokens=${u.inputTokens} output_tokens=${u.outputTokens} cache_read_input_tokens=${u.cacheReadTokens} cache_creation_input_tokens=${u.cacheWriteTokens}`;
}

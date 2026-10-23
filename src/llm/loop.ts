import { addUsage, EMPTY_USAGE, type LlmInput, type LlmMessage, type LlmProvider, type LlmStopReason, type LlmToolCall, type LlmUsage } from './types';

export const MAX_TOOL_ITERATIONS = 5;

export interface ToolExecResult {
  content: string;
  isError: boolean;
}

/** Eventos de progreso del bucle (independientes del proveedor) para mostrar la fase al usuario. */
export type LoopPhaseEvent =
  | { type: 'thinking' }
  | { type: 'writing' }
  | { type: 'tool'; call: LlmToolCall };

export type PhaseListener = (event: LoopPhaseEvent) => void | Promise<void>;

export type ToolExecutor = (call: LlmToolCall) => Promise<ToolExecResult>;

export interface ToolLoopResult {
  /** Texto de todos los turnos (separados por párrafo) */
  text: string;
  stopReason: LlmStopReason | 'iteration_cap';
  iterations: number;
  usage: LlmUsage;
  messages: LlmMessage[];
}

/** Resultados de herramientas de un turno: una única entrada con todos los resultados. */
export async function executeToolCalls(calls: LlmToolCall[], exec: ToolExecutor, onPhase?: PhaseListener): Promise<LlmMessage> {
  const results: { id: string; content: string; isError: boolean }[] = [];
  for (const call of calls) {
    if (call.argsError) {
      // JSON ilegible: se devuelve el error al modelo para que reintente
      results.push({ id: call.id, content: JSON.stringify({ error: `Argumentos inválidos: ${call.argsError}` }), isError: true });
      continue;
    }
    try {
      // Se espera: el listener puede persistir un marcador que debe existir antes de que la herramienta tenga efectos
      if (onPhase) await onPhase({ type: 'tool', call });
      const r = await exec(call);
      results.push({ id: call.id, content: r.content, isError: r.isError });
    } catch (e: any) {
      results.push({ id: call.id, content: JSON.stringify({ error: e?.message || 'Error ejecutando la herramienta' }), isError: true });
    }
  }
  return { role: 'tool_results', results };
}

/** Texto de cierre cuando el modelo no terminó limpiamente. */
export function closingNote(stopReason: ToolLoopResult['stopReason'], text: string): string {
  if (stopReason === 'max_tokens') return '\n\n_(Respuesta cortada por límite de longitud. Pídeme que continúe.)_';
  if (stopReason === 'refusal') return text.trim() ? '' : 'No puedo ayudarte con esa petición.';
  if (stopReason === 'iteration_cap') return '\n\n_(He alcanzado el límite de acciones en un mismo mensaje. Revisa el entreno y dime si falta algo.)_';
  return '';
}

/**
 * Bucle manual de herramientas independiente del proveedor.
 * Llama al modelo, ejecuta TODAS las tool calls de cada turno, devuelve un único mensaje
 * con todos los resultados y repite, con un máximo de `maxIterations` turnos.
 */
export async function runToolLoop(opts: {
  provider: LlmProvider;
  input: Omit<LlmInput, 'messages'> & { messages: LlmMessage[] };
  exec: ToolExecutor;
  onText: (delta: string) => void;
  /** Progreso: nuevo turno del modelo, primer texto del turno y herramienta a punto de ejecutarse */
  onPhase?: PhaseListener;
  maxIterations?: number;
  /**
   * Herramientas que no necesitan que el modelo vuelva a hablar después: si en un turno el modelo
   * ya ha escrito texto y SOLO llama a estas herramientas y todas van bien, se termina sin otra
   * llamada al modelo (ahorra una ida y vuelta completa).
   */
  terminalTools?: ReadonlySet<string>;
}): Promise<ToolLoopResult> {
  const max = opts.maxIterations ?? MAX_TOOL_ITERATIONS;
  const messages: LlmMessage[] = [...opts.input.messages];
  let text = '';
  let usage = EMPTY_USAGE;
  let iterations = 0;
  let stopReason: ToolLoopResult['stopReason'] = 'end';

  const emit = (delta: string) => {
    text += delta;
    opts.onText(delta);
  };

  while (iterations < max) {
    iterations++;
    let separated = false;
    const hadText = text.trim().length > 0;
    let wrote = false;
    // Un fallo al informar de la fase nunca debe romper la generación
    const phase = (e: LoopPhaseEvent): Promise<void> => {
      try { return Promise.resolve(opts.onPhase?.(e)).catch(() => {}); } catch { return Promise.resolve(); }
    };
    void phase({ type: 'thinking' });
    const turn = await opts.provider.runTurn({ ...opts.input, messages }, delta => {
      // Separa el texto de turnos distintos con un párrafo
      if (!wrote && delta.trim()) { wrote = true; void phase({ type: 'writing' }); }
      if (!separated && hadText && delta.trim()) { emit('\n\n'); separated = true; }
      emit(delta);
    });
    usage = addUsage(usage, turn.usage);
    stopReason = turn.stopReason;

    if (turn.stopReason === 'tool_use' && turn.toolCalls.length > 0) {
      messages.push(turn.assistant);
      const results = await executeToolCalls(turn.toolCalls, opts.exec, opts.onPhase ? phase : undefined);
      messages.push(results);
      if (puedeTerminarTrasHerramientas(turn.text, turn.toolCalls, results, opts.terminalTools)) {
        stopReason = 'end';
        break;
      }
      if (iterations >= max) stopReason = 'iteration_cap';
      continue;
    }
    // end, max_tokens (nunca se ejecutan tool calls truncadas) o refusal
    if (stopReason === 'tool_use') stopReason = 'end';
    messages.push(turn.assistant);
    break;
  }

  const note = closingNote(stopReason, text);
  if (note) emit(note);
  return { text, stopReason, iterations, usage, messages };
}

/** ¿Se puede cerrar el turno sin volver a llamar al modelo? (ver `terminalTools` en runToolLoop) */
export function puedeTerminarTrasHerramientas(
  text: string,
  calls: LlmToolCall[],
  results: LlmMessage,
  terminal: ReadonlySet<string> | undefined,
): boolean {
  if (!terminal || !text.trim() || calls.length === 0) return false;
  if (!calls.every(c => terminal.has(c.name))) return false;
  return results.role === 'tool_results' && results.results.every(r => !r.isError);
}

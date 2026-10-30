import OpenAI from 'openai';
import type { LlmInput, LlmProvider, LlmTurn } from './types';
import { accumulateToolCallDeltas, finalizeToolCalls, mapOpenAiFinishReason, mapOpenAiUsage, toOpenAiMessages, toOpenAiTools, type ToolCallAccumulator } from './openaiConvert';

import { OPENAI_DEFAULT_MODEL } from './config';
import type { Routing } from './models';

export interface OpenAiOptions {
  baseURL?: string;
  name?: string;
  thinking?: 'adaptive' | 'off';
  /** 'auto' = no se envía el parámetro y cada modelo usa su razonamiento por defecto */
  effort?: 'low' | 'medium' | 'high' | 'auto';
  routing?: Routing;
}

/** Objeto `provider` de OpenRouter a partir de las preferencias de enrutado del modelo */
export function openRouterProvider(r?: Routing): Record<string, unknown> {
  return {
    require_parameters: true,
    allow_fallbacks: true,
    ...(r?.order?.length ? { order: r.order } : {}),
    ...(r?.quantizations?.length ? { quantizations: r.quantizations } : {}),
    ...(r?.minThroughput ? { preferred_min_throughput: r.minThroughput } : {}),
    ...(r?.maxLatency ? { preferred_max_latency: r.maxLatency } : {}),
  };
}

/** Une los trozos de reasoning_details del stream por índice (el texto llega troceado). */
export function acumularRazonamiento(acc: Map<number, Record<string, unknown>>, trozos: unknown): void {
  if (!Array.isArray(trozos)) return;
  for (const raw of trozos) {
    if (!raw || typeof raw !== 'object') continue;
    const d = raw as Record<string, unknown>;
    const index = typeof d.index === 'number' ? d.index : acc.size;
    const cur = acc.get(index);
    if (!cur) { acc.set(index, { ...d }); continue; }
    for (const [k, v] of Object.entries(d)) {
      if (k === 'index') continue;
      if (typeof v === 'string' && typeof cur[k] === 'string' && ['text', 'summary', 'data'].includes(k)) cur[k] = (cur[k] as string) + v;
      else if (v !== undefined && v !== null) cur[k] = v;
    }
  }
}

export function createOpenAiProvider(apiKey: string, model = OPENAI_DEFAULT_MODEL, opts: OpenAiOptions = {}): LlmProvider {
  const client = new OpenAI({
    apiKey,
    baseURL: opts.baseURL,
    defaultHeaders: opts.baseURL ? { 'HTTP-Referer': 'https://myprfr.pages.dev', 'X-Title': 'MyPR' } : undefined,
  });

  return {
    name: (opts.name ?? 'openai') as 'openai' | 'openrouter',
    model,
    async runTurn(input: LlmInput, onText: (delta: string) => void): Promise<LlmTurn> {
      // Sin temperature/top_p: no se asume soporte para este modelo
      const stream = await client.chat.completions.create({
        model,
        messages: toOpenAiMessages(input.system, input.messages, { toolReminder: !!opts.baseURL }) as OpenAI.Chat.ChatCompletionMessageParam[],
        tools: toOpenAiTools(input.tools),
        tool_choice: 'auto',
        max_completion_tokens: input.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        // OpenRouter: solo proveedores que soporten todos los parámetros (herramientas), más las preferencias del modelo
        ...(opts.baseURL ? { provider: openRouterProvider(opts.routing) } : {}),
        // OpenRouter: razonamiento corto cuando se pide respuesta rápida (los modelos sin razonamiento lo ignoran)
        ...(opts.effort === 'auto' ? {} : opts.effort ? { reasoning: { effort: opts.effort } } : opts.thinking === 'off' ? { reasoning: { effort: 'low' } } : {}),
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming);

      let text = '';
      let finishReason: string | null = null;
      let sawRefusal = false;
      let usage: unknown = undefined;
      const acc: ToolCallAccumulator = new Map();
      // OpenRouter: bloques de razonamiento del turno (se devuelven en el siguiente para no perder el hilo)
      const reasoning = new Map<number, Record<string, unknown>>();

      for await (const chunk of stream) {
        if (chunk.usage) usage = chunk.usage;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.content) {
          text += delta.content;
          onText(delta.content);
        }
        if (delta?.refusal) sawRefusal = true;
        accumulateToolCallDeltas(acc, delta?.tool_calls as any);
        acumularRazonamiento(reasoning, (delta as any)?.reasoning_details);
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      const toolCalls = finalizeToolCalls(acc);
      const reasoningDetails = Array.from(reasoning.entries()).sort((a, b) => a[0] - b[0]).map(([, d]) => d);
      return {
        text,
        toolCalls,
        stopReason: mapOpenAiFinishReason(finishReason, sawRefusal, toolCalls.length > 0),
        usage: mapOpenAiUsage(usage),
        assistant: { role: 'assistant', text, toolCalls, ...(reasoningDetails.length ? { providerData: { reasoning_details: reasoningDetails } } : {}) },
      };
    },
  };
}

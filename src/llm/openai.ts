import OpenAI from 'openai';
import type { LlmInput, LlmProvider, LlmTurn } from './types';
import { accumulateToolCallDeltas, finalizeToolCalls, mapOpenAiFinishReason, mapOpenAiUsage, toOpenAiMessages, toOpenAiTools, type ToolCallAccumulator } from './openaiConvert';

import { OPENAI_DEFAULT_MODEL } from './config';

export function createOpenAiProvider(apiKey: string, model = OPENAI_DEFAULT_MODEL): LlmProvider {
  const client = new OpenAI({ apiKey });

  return {
    name: 'openai',
    model,
    async runTurn(input: LlmInput, onText: (delta: string) => void): Promise<LlmTurn> {
      // Sin temperature/top_p: no se asume soporte para este modelo
      const stream = await client.chat.completions.create({
        model,
        messages: toOpenAiMessages(input.system, input.messages) as OpenAI.Chat.ChatCompletionMessageParam[],
        tools: toOpenAiTools(input.tools),
        tool_choice: 'auto',
        max_completion_tokens: input.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      let text = '';
      let finishReason: string | null = null;
      let sawRefusal = false;
      let usage: unknown = undefined;
      const acc: ToolCallAccumulator = new Map();

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
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      const toolCalls = finalizeToolCalls(acc);
      return {
        text,
        toolCalls,
        stopReason: mapOpenAiFinishReason(finishReason, sawRefusal),
        usage: mapOpenAiUsage(usage),
        assistant: { role: 'assistant', text, toolCalls },
      };
    },
  };
}

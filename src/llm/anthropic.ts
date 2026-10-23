import Anthropic from '@anthropic-ai/sdk';
import type { LlmInput, LlmProvider, LlmToolCall, LlmTurn } from './types';
import { mapAnthropicStopReason, mapAnthropicUsage, toAnthropicMessages, toAnthropicSystem, toAnthropicTools } from './anthropicConvert';

import { ANTHROPIC_DEFAULT_MODEL } from './config';

export function createAnthropicProvider(apiKey: string, model = ANTHROPIC_DEFAULT_MODEL): LlmProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: 'anthropic',
    model,
    async runTurn(input: LlmInput, onText: (delta: string) => void): Promise<LlmTurn> {
      // Haiku 5.5: pensamiento adaptativo siempre activo. Sin budget_tokens, temperature, top_p, top_k ni prefill.
      const stream = client.messages.stream({
        model,
        max_tokens: input.maxTokens,
        system: toAnthropicSystem(input.system),
        messages: toAnthropicMessages(input.messages) as Anthropic.MessageParam[],
        tools: toAnthropicTools(input.tools) as Anthropic.Tool[],
        tool_choice: { type: 'auto' },
        output_config: { effort: 'low' },
      });
      stream.on('text', delta => onText(delta));

      const message = await stream.finalMessage();

      const toolCalls: LlmToolCall[] = message.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map(b => ({ id: b.id, name: b.name, args: b.input }));
      const text = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      return {
        text,
        toolCalls,
        stopReason: mapAnthropicStopReason(message.stop_reason),
        usage: mapAnthropicUsage(message.usage),
        // content se reenvía sin tocar (incluye bloques thinking)
        assistant: { role: 'assistant', text, toolCalls, providerData: message.content },
      };
    },
  };
}

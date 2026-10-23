import type { LlmProvider } from './types';
import { createAnthropicProvider } from './anthropic';
import { createOpenAiProvider } from './openai';
import { resolveProviderConfig, type LlmEnv } from './config';

export * from './types';
export * from './config';

export function createProvider(env: LlmEnv): LlmProvider {
  const cfg = resolveProviderConfig(env);
  return cfg.provider === 'anthropic'
    ? createAnthropicProvider(cfg.apiKey, cfg.model, { thinking: cfg.thinking })
    : createOpenAiProvider(cfg.apiKey, cfg.model);
}

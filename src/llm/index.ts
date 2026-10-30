import type { LlmProvider } from './types';
import { createAnthropicProvider } from './anthropic';
import { createOpenAiProvider } from './openai';
import { resolveModelConfig, type LlmEnv } from './config';

export * from './types';
export * from './config';
export * from './models';

export function createProvider(env: LlmEnv, modelId?: string | null): LlmProvider {
  const cfg = resolveModelConfig(env, modelId);
  if (cfg.provider === 'anthropic') return createAnthropicProvider(cfg.apiKey, cfg.model, { thinking: cfg.thinking });
  if (cfg.provider === 'openrouter') return createOpenAiProvider(cfg.apiKey, cfg.model, { baseURL: 'https://openrouter.ai/api/v1', name: 'openrouter', thinking: cfg.thinking, effort: cfg.effort, providers: cfg.providers });
  return createOpenAiProvider(cfg.apiKey, cfg.model);
}

export const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-5-5';
export const OPENAI_DEFAULT_MODEL = 'gpt-6-luna';

export interface LlmEnv {
  LLM_PROVIDER?: string;
  LLM_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

export interface ProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
}

/** Resuelve proveedor, modelo y clave desde el entorno; lanza un error en español si falta la clave. */
export function resolveProviderConfig(env: LlmEnv): ProviderConfig {
  const raw = (env.LLM_PROVIDER || 'anthropic').trim().toLowerCase();
  if (raw !== 'anthropic' && raw !== 'openai') {
    throw new Error(`LLM_PROVIDER no válido: "${env.LLM_PROVIDER}". Usa "anthropic" u "openai".`);
  }
  const model = env.LLM_MODEL?.trim() || (raw === 'anthropic' ? ANTHROPIC_DEFAULT_MODEL : OPENAI_DEFAULT_MODEL);
  const apiKey = raw === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(`El entrenador IA no está configurado: falta ${raw === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}.`);
  }
  return { provider: raw, model, apiKey };
}

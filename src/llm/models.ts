// Catálogo cerrado de modelos que el usuario puede elegir para el entrenador. Los de Anthropic van por su
// API directa (caché de prefijo y razonamiento adaptativo); el resto, por OpenRouter (API compatible con OpenAI).
// Precios en USD por 1M tokens (entrada / salida), leídos de OpenRouter el 2026-10-30: revisar de vez en cuando.

export type ModelRoute = 'anthropic' | 'openrouter';

export interface CatalogModel {
  id: string;
  /** Identificador real en la API del proveedor */
  model: string;
  route: ModelRoute;
  label: string;
  group: string;
  inputPrice: number;
  outputPrice: number;
  note?: string;
  /** Esfuerzo de razonamiento fijo para este modelo (OpenRouter); sin él se usa el global (LLM_THINKING) */
  effort?: 'low' | 'medium' | 'high';
}

export const MODEL_CATALOG: CatalogModel[] = [
  { id: 'claude-haiku-5-5', model: 'claude-haiku-5-5', route: 'anthropic', label: 'Claude Haiku 5.5', group: 'Anthropic', inputPrice: 0.1, outputPrice: 0.5, note: 'El de siempre' },
  { id: 'claude-sonnet-5-5', model: 'claude-sonnet-5-5', route: 'anthropic', label: 'Claude Sonnet 5.5', group: 'Anthropic', inputPrice: 2, outputPrice: 10 },
  { id: 'gpt-6-luna', model: 'openai/gpt-6-luna', route: 'openrouter', label: 'GPT-6 Luna', group: 'OpenAI', inputPrice: 0.1, outputPrice: 0.5 },
  { id: 'gpt-6.1-terra', model: 'openai/gpt-6.1-terra', route: 'openrouter', label: 'GPT-6.1 Terra', group: 'OpenAI', inputPrice: 1, outputPrice: 5 },
  { id: 'gpt-6.1-sol', model: 'openai/gpt-6.1-sol', route: 'openrouter', label: 'GPT-6.1 Sol', group: 'OpenAI', inputPrice: 2, outputPrice: 10 },
  { id: 'gemini-4-argon', model: 'google/gemini-4-argon', route: 'openrouter', label: 'Gemini 4 Argon', group: 'Google', inputPrice: 2, outputPrice: 10, note: 'En la API de Google sube de precio el 1-dic-2026' },
  { id: 'deepseek-v4.1-flash', model: 'deepseek/deepseek-v4.1-flash-1017', route: 'openrouter', label: 'DeepSeek V4.1 Flash', group: 'DeepSeek', inputPrice: 0.15, outputPrice: 0.6, note: 'Tarifa fuera de hora punta' },
  { id: 'deepseek-v4.1-flash-high', model: 'deepseek/deepseek-v4.1-flash-1017', route: 'openrouter', label: 'DeepSeek V4.1 Flash · high', group: 'DeepSeek', inputPrice: 0.15, outputPrice: 0.6, note: 'Razonamiento alto; fuera de hora punta', effort: 'high' },
  { id: 'deepseek-v4-pro', model: 'deepseek/deepseek-v4-pro-0813', route: 'openrouter', label: 'DeepSeek V4 Pro', group: 'DeepSeek', inputPrice: 0.66, outputPrice: 1.98, note: 'Tarifa fuera de hora punta' },
  { id: 'mimo-v2.6-pro', model: 'xiaomi/mimo-v2.6-pro', route: 'openrouter', label: 'MiMo 2.6 Pro', group: 'Xiaomi', inputPrice: 0.435, outputPrice: 0.87 },
  { id: 'grok-4.3', model: 'x-ai/grok-4.3', route: 'openrouter', label: 'Grok 4.3', group: 'xAI', inputPrice: 1.25, outputPrice: 2.5 },
  { id: 'grok-4.7', model: 'x-ai/grok-4.7', route: 'openrouter', label: 'Grok 4.7', group: 'xAI', inputPrice: 2, outputPrice: 6 },
  { id: 'qwen3.7-plus', model: 'qwen/qwen3.7-plus', route: 'openrouter', label: 'Qwen 3.7 Plus', group: 'Alibaba', inputPrice: 0.32, outputPrice: 1.28 },
  { id: 'minimax-m3', model: 'minimax/minimax-m3', route: 'openrouter', label: 'MiniMax M3', group: 'MiniMax', inputPrice: 0.3, outputPrice: 1.2 },
  { id: 'glm-5.3-flashx', model: 'z-ai/glm-5.3-flashx', route: 'openrouter', label: 'GLM 5.3 FlashX', group: 'Z.ai', inputPrice: 0.37, outputPrice: 1.25 },
  { id: 'kimi-k3.1-pro', model: 'moonshotai/kimi-k3.1-pro', route: 'openrouter', label: 'Kimi K3.1 Pro', group: 'Moonshot', inputPrice: 2, outputPrice: 10 },
];

export const DEFAULT_MODEL_ID = 'claude-haiku-5-5';

export const findModel = (id: string | null | undefined): CatalogModel | undefined =>
  MODEL_CATALOG.find(m => m.id === id);

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
  effort?: 'low' | 'medium' | 'high' | 'auto';
  /** Enrutado en OpenRouter (proveedor, calidad y rendimiento mínimo). Sin él: reparto automático de OpenRouter */
  routing?: Routing;
  /** Razonamiento previo (Anthropic): sustituye al global LLM_THINKING para este modelo */
  thinking?: 'adaptive' | 'off';
}

export interface Routing {
  /** Proveedores a probar antes que el resto, por orden */
  order?: string[];
  /** Cuantizaciones admitidas (se descartan, p. ej., los fp4) */
  quantizations?: string[];
  /** Los que den menos tokens/s pasan al final de la cola */
  minThroughput?: number;
  /** Los que tarden más (s, mediana) al primer token pasan al final de la cola */
  maxLatency?: number;
}

// DeepSeek: reparto automático de OpenRouter (precio, velocidad, fiabilidad y herramientas), sin los fp4 y
// mandando al final a los que no lleguen a 60 tok/s o tarden más de 3 s al primer token: el más barato que sea rápido.
const DEEPSEEK_ROUTING: Routing = { quantizations: ['fp8', 'bf16', 'unknown'], minThroughput: 60, maxLatency: 3 };
// OpenAI: primero su propia API (Azure y Bedrock cobran algo más por lo mismo)
const OPENAI_ROUTING: Routing = { order: ['OpenAI'] };

export const MODEL_CATALOG: CatalogModel[] = [
  // Haiku: razonamiento adaptativo con tope medio (en alto agotaba la salida y cortaba la respuesta)
  { id: 'claude-haiku-5-5', model: 'claude-haiku-5-5', route: 'anthropic', label: 'Claude Haiku 5.5', group: 'Anthropic', inputPrice: 0.1, outputPrice: 0.5, note: 'Razonamiento adaptativo', effort: 'medium', thinking: 'adaptive' },
  { id: 'gpt-6-luna', model: 'openai/gpt-6-luna', route: 'openrouter', label: 'GPT-6 Luna', group: 'OpenAI', inputPrice: 0.1, outputPrice: 0.5, note: 'Razonamiento máximo', effort: 'high', routing: OPENAI_ROUTING },
  { id: 'gpt-6.1-sol-low', model: 'openai/gpt-6.1-sol', route: 'openrouter', label: 'GPT-6.1 Sol · low', group: 'OpenAI', inputPrice: 2, outputPrice: 10, note: 'Razonamiento bajo', effort: 'low', routing: OPENAI_ROUTING },
  { id: 'deepseek-v4.1-flash', model: 'deepseek/deepseek-v4.1-flash-1017', route: 'openrouter', label: 'DeepSeek V4.1 Flash', group: 'DeepSeek', inputPrice: 0.15, outputPrice: 0.6, note: 'Razonamiento adaptativo; fuera de hora punta', routing: DEEPSEEK_ROUTING },
];

export const DEFAULT_MODEL_ID = 'claude-haiku-5-5';

export const findModel = (id: string | null | undefined): CatalogModel | undefined =>
  MODEL_CATALOG.find(m => m.id === id);

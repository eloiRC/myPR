# Elección de LLM para el coach de MyPR

Fecha: 2026-10-23. Precios en USD por 1M tokens (MTok), tier estándar, leídos de las páginas oficiales (fuentes al final). Los precios cambian rápido: revalidar antes de migrar.

## 1. Estimación de tokens por mensaje

Leído de `procesarChatJob` (`src/index.ts`) y `src/coachAnalysis.ts`. Estimación para un usuario con 40 entrenos, 30 ejercicios y 6 turnos de historial (español, ~3,5 caracteres/token):

| Bloque | Tokens aprox. |
|---|---|
| Persona/system prompt fijo (~3.800 car.) | 1.100 |
| Análisis precalculado (frescura, 12 últimas sesiones, estancamientos, rotación, catálogo de 30 ejercicios) | 2.500 |
| Contexto actual + prompt personalizado | 300 |
| Historial (6 turnos, respuestas del coach largas) | 1.500 |
| Mensaje del usuario | 50 |
| **Entrada total** | **~5.500** (con definiciones de tools: ~6.300) |
| **Salida** (texto ES ~500 + JSON/plan ~300) | **~800** |

Escenarios por 1.000 mensajes: 5,5M tokens de entrada y 0,8M de salida. Escenario "con caché": 70 % de la entrada se sirve de caché (system + análisis se repiten entre turnos del mismo chat; hay que mantener el prefijo estable y poner lo variable al final). Ojo: en modelos con razonamiento los "thinking tokens" se facturan como salida; si piensan ~2.000 tokens por respuesta, la salida pasa a ~2.800 y el coste de salida se multiplica x3,5. Hay que fijar esfuerzo/thinking bajo para este caso de uso.

## 2. Tabla comparativa

| Modelo (id) | Entrada / Salida / Caché | Contexto | Tool calling | Español | Streaming / latencia | Datos / ubicación | SDK en Workers |
|---|---|---|---|---|---|---|---|
| Gemini 3.8 / 3.6 Flash (`gemini-3.8-flash`, `gemini-3.6-flash`) | 0,75 / 3,75 / 0,075 (+0,50 $/MTok/h almacenamiento). **Suben a 1,50 / 7,50 el 1-ene-2027** | no indicado en la página | Sí, nativo | Muy bueno | Sí, rápido | Google; revisar ToS del tier de pago | `@google/generative-ai` (ya en uso), endpoint OpenAI-compat, AI Gateway |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | 0,30 / 2,50 / 0,03 | no indicado | Sí | Bueno | Sí, muy rápido | Idem | Idem |
| Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`) | 0,25 / 1,50 / 0,025 | no indicado | Sí | Bueno | Sí | Idem | Idem |
| DeepSeek V4.1 Flash (`deepseek-flash`, API directa) | pico 0,30 / 1,20 / caché 0,006; valle (fuera de horas pico) la mitad: 0,15 / 0,60 / 0,003 | 1M, salida hasta 384K | Sí (documentado) | Bueno | Sí; carga variable | **Servidores en China** según su política; Italia lo bloqueó (2025), Berlín lo calificó de transferencia ilegal bajo GDPR art. 46 | OpenAI-compat (`openai` npm), AI Gateway |
| DeepSeek V4 Pro (`deepseek-v4-pro`) | pico 1,32 / 3,96 / 0,044 | 1M | Sí | Bueno | Sí | Idem | Idem |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | 0,10 / 0,50 / lectura caché 0,01 (escritura 5 min 0,125). Prompts >100K: 0,50 / 2,50 | 1M, salida 128K | Sí, tool use es punto fuerte de Anthropic; thinking adaptativo | Muy bueno | Sí, "el más rápido" de la gama | Anthropic (EE. UU.); también Bedrock/Vertex con endpoints regionales | `@anthropic-ai/sdk` (fetch, válido en Workers) o `/compat` de AI Gateway |
| Claude Haiku 4.5 (`claude-haiku-4-5`, el que pediste) | 1 / 5 / caché 0,10 (escritura 1,25) | ver docs | Sí | Muy bueno | Sí | Idem | Idem |
| OpenAI `gpt-6-luna` | 0,10 / 0,50 / 0,01 | no consultado | Sí | Muy bueno | Sí | OpenAI EE. UU. | `openai` npm (ya instalado) |
| OpenAI `gpt-5.6-luna` | 0,20 / 1,20 / 0,02 | idem | Sí | Muy bueno | Sí | Idem | Idem |
| OpenAI `gpt-5.4-mini` | 0,75 / 4,50 / 0,075 | idem | Sí | Muy bueno | Sí | Idem | Idem |
| Mistral Small 4 (`mistral-small-4-0-26-03`) | 0,15 / 0,60 | 256K | Sí (`/v1/chat/completions`) | Bueno | Sí | Empresa francesa | API OpenAI-compat; AI Gateway |
| Workers AI `gpt-oss-120b` | 0,35 / 0,75 | no indicado | Sí (no verificado en la doc consultada) | Aceptable | Sí | Cloudflare, sin vendor extra | Binding `env.AI`, REST OpenAI-compat |
| Workers AI `deepseek-v4.1-flash-1017` | 0,30 / 1,20 / caché 0,006 | hasta 1M | Sí en la API de DeepSeek; confirmar en la ficha de Workers AI | Bueno | Sí | **Alojado por Cloudflare, no se envía a DeepSeek China**; mismo precio que la API directa | Binding o REST |
| Workers AI `glm-5.3-flash` | 0,15 / 0,50 / caché 0,03 | no indicado | Familia GLM anuncia function calling | Aceptable | Sí | Cloudflare | Binding o REST |
| Workers AI `gemma-4-26b-a4b-it` | 0,10 / 0,30 | no indicado | No confirmado | Bueno | Sí | Cloudflare | Binding o REST |
| Workers AI `mistral-small-3.1-24b` | 0,351 / 0,555 | no indicado | No confirmado | Bueno | Sí | Cloudflare | Binding o REST |

Notas importantes:
- `gemini-3.5-flash` (el modelo del código actual) **no aparece** en la tabla oficial de precios de hoy. Hay que confirmar si sigue disponible; usé 3.6/3.8 Flash (0,75 / 3,75) como referencia, que doblan precio el 1-ene-2027. Ese es el motivo real del coste alto.
- La fiabilidad de tool calling no la he podido medir con benchmarks oficiales: la tabla refleja soporte documentado, no tasas de error. Hace falta una evaluación propia (sección 6).
- La doc de function calling de Workers AI menciona el helper `runWithTools` (`@cloudflare/ai-utils`) y modelos con etiqueta "function calling" en el catálogo; no documenta streaming con tools.

## 3. Coste por 1.000 mensajes (5,5M entrada + 0,8M salida)

| Modelo | Sin caché | Con caché (70 % de la entrada) |
|---|---|---|
| Gemini 3.6/3.8 Flash (hoy) | 7,13 $ | ~4,5 $ (sin contar almacenamiento de caché) |
| Gemini 3.6/3.8 Flash (desde 1-ene-2027) | 14,25 $ | ~9 $ |
| Gemini 3.5 Flash-Lite | 3,65 $ | ~2,6 $ |
| Gemini 3.1 Flash-Lite | 2,58 $ | ~1,9 $ |
| DeepSeek V4.1 Flash, pico | 2,61 $ | 1,48 $ |
| DeepSeek V4.1 Flash, valle | 1,31 $ | 0,74 $ |
| DeepSeek V4 Pro, pico | 10,4 $ | ~5,6 $ |
| Claude Haiku 5.5 | **0,95 $** | **0,60 $** |
| Claude Haiku 4.5 | 9,50 $ | ~6,0 $ |
| OpenAI gpt-6-luna | **0,95 $** | **0,60 $** |
| OpenAI gpt-5.6-luna | 2,06 $ | 1,37 $ |
| OpenAI gpt-5.4-mini | 7,73 $ | ~5,2 $ |
| Mistral Small 4 | 1,31 $ | ~0,8 $ (si aplica caché de entrada) |
| Workers AI gpt-oss-120b | 2,53 $ | n/d (sin caché) |
| Workers AI deepseek-v4.1-flash | 2,61 $ | 1,48 $ |
| Workers AI glm-5.3-flash | 1,23 $ | 0,76 $ |
| Workers AI gemma-4-26b | 0,79 $ | n/d |

Con "thinking" activo (+2.000 tokens de salida por mensaje): suma +7,5 $ a Gemini Flash, +1,0 $ a Haiku 5.5 y gpt-6-luna, +2,4 $ a DeepSeek pico, +10 $ a Haiku 4.5. El razonamiento puede dominar la factura.

Perspectiva: incluso Gemini Flash hoy son ~0,7 céntimos por mensaje. Con 100 usuarios activos x 30 mensajes/mes (3.000 msgs) son ~21 $/mes, y ~43 $/mes desde 2027. La diferencia absoluta con DeepSeek es de pocos dólares a esta escala; no conviene sacrificar privacidad ni fiabilidad de tools por céntimos.

## 4. Privacidad (app de salud-adyacente)

- DeepSeek API directa: su política declara servidores en la República Popular China; Italia bloqueó la app (ene-2025), Berlín la calificó de transferencia ilegal (jun-2025), Irlanda y Bélgica abrieron investigaciones. No recomendado para datos de lesiones/salud. Alternativa: el mismo modelo alojado en Workers AI.
- Lesiones y objetivos en la "memoria" son datos de salud potencialmente de categoría especial en GDPR: revisar DPA, retención y opciones de residencia UE de cada proveedor (no verificado en esta investigación).
- AI Gateway ofrece DLP gratuito y logs; los logs guardan prompts/respuestas con datos del usuario: limitar retención o desactivar el log de contenido.

## 5. Recomendación

- **Principal: Claude Haiku 5.5** (`claude-haiku-5-5`): 0,10 / 0,50 $/MTok, 1M de contexto, buen español, tool use sólido, streaming, ~0,6-0,95 $/1.000 mensajes. Fijar `effort` bajo y `max_tokens`. Alternativa de idéntico coste para comparar en la evaluación: OpenAI `gpt-6-luna` (el paquete `openai` ya está instalado).
- **Fallback: DeepSeek V4.1 Flash en Workers AI** (`@cf/deepseek-ai/deepseek-v4.1-flash-1017`): otro proveedor, misma plataforma, sin enviar datos a China, ~1,5-2,6 $/1.000. Otra opción europea: Mistral Small 4.
- **Gemini**: si se queda, pasar a Flash-Lite (2-3,6 $/1.000, sin la subida de enero). Mantener Flash completo no se justifica.
- **No** usar DeepSeek API directa con datos de salud.
- **RAG**: embeddings `@cf/baai/bge-m3` (0,012 $/MTok, multilingüe) o `@cf/qwen/qwen3-embedding-0.6b` (0,012) + Vectorize (Workers Paid: 10M dimensiones almacenadas y 50M consultadas incluidas; luego 0,05 $/100M almacenadas y 0,01 $/M consultadas; sin egress). Coste prácticamente nulo para una base curada.
- **AI Gateway**: usarlo siempre delante. Caché, rate limiting y analítica de coste/tokens son gratis en todos los planes; fallback entre proveedores con el endpoint Universal (array de peticiones, cabecera `cf-aig-step`); endpoint OpenAI-compat `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway}/compat/chat/completions` con modelos `{provider}/{model}` (Anthropic, OpenAI, Google, Mistral, DeepSeek, Workers AI...). La doc recomienda para integraciones nuevas la REST de Workers AI o el binding. Créditos unificados con 5 % de comisión. Logs: 100.000 en Free, 10M por gateway en Paid (cuentas anteriores al 24-sep-2026; las nuevas usan Workers Logs). Matiz: la caché de respuestas del Gateway solo sirve con peticiones idénticas, poco útil en chat personalizado; el ahorro real viene de la caché de prefijo del proveedor.

## 6. Esbozo de migración

1. **Interfaz de proveedor** (`src/llm/types.ts`):

```ts
interface LlmProvider {
  stream(req: {
    system: string;
    messages: { role: 'user'|'assistant'|'tool'; content: string; toolCalls?: ToolCall[]; toolCallId?: string }[];
    tools: ToolDef[];            // JSON Schema
    temperature?: number; maxTokens?: number;
  }): AsyncIterable<
    | { type: 'text'; delta: string }
    | { type: 'tool_call'; id: string; name: string; args: unknown }
    | { type: 'usage'; input: number; output: number; cached?: number }
  >;
}
```

   Implementaciones: `OpenAiCompatProvider` (cubre OpenAI, DeepSeek, Mistral, Gemini-compat, Workers AI REST y el `/compat` de AI Gateway usando el paquete `openai` con `baseURL`) y, si hace falta, `AnthropicProvider` nativo. Selección por `env.LLM_PROVIDER` / `env.LLM_MODEL`. El historial pasa a formato neutro y cada adaptador lo convierte (hoy se pasa en formato Gemini).
2. **Function calling en lugar de `json_plan`**: tools con JSON Schema: `add_sets({sets:[{exerciseId,kg,reps}]})`, `edit_set`, `delete_set`, `edit_workout`, `create_exercise`, `rename_workout({name})` (sustituye a `[TITULO_AUTO]`), `memory_read()`, `memory_write({kind:'injury'|'goal'|'preference', text})`. El ejecutor valida con zod y con `analysis.validExerciseIds` (como ya se hace), toma `userId` del JWT (nunca del modelo) y devuelve el resultado como mensaje `tool`. Bucle: stream de texto, acumular tool calls, ejecutar, reenviar; máximo 4 iteraciones. Se elimina el regex de `json_plan` y la sección "FORMATO JSON_PLAN" del prompt.
3. **Seguridad/deshacer**: confirmación en UI para `delete_set` y `edit_workout`; registrar cada tool call en D1 para poder deshacer.
4. **Memoria**: tabla `CoachMemory(UserId, Kind, Text, UpdatedAt)`; inyectar las entradas (pocas) en el system prompt en vez de gastar una llamada de tool en leerlas.
5. **Caché**: persona + catálogo + análisis primero; lo variable (fecha, series de hoy) al final; `cache_control` en Anthropic.
6. **Observabilidad**: todo por AI Gateway; guardar `usage` por job.
7. **Evaluación previa** (una tarde): 30 conversaciones reales anonimizadas contra Haiku 5.5, gpt-6-luna, DeepSeek V4.1 Flash (Workers AI), Mistral Small 4 y Gemini Flash-Lite; medir % de tool calls válidas, IDs inventados, calidad de español, latencia al primer token y coste real.
8. **Despliegue**: feature flag por usuario, 10 % de tráfico, fallback automático vía Gateway.

## 7. Riesgos

- Precios inestables (Gemini dobla en enero; Haiku 5.5 figura como "desde"): alertas de gasto y revisión mensual.
- Tool calling poco fiable en modelos pequeños/abiertos (IDs inventados, argumentos mal formados): validar siempre con zod y lista de IDs; reintentar devolviendo el error al modelo.
- Streaming con tools no uniforme entre proveedores y con el Gateway (la doc consultada no lo detalla): probar en cada adaptador.
- Thinking tokens disparan el coste: esfuerzo bajo.
- Datos de salud: DPA, retención de logs del Gateway, no enviar PII (email, nombre) en prompts.
- Jobs en memoria (`createJob` + `waitUntil`) en el Worker: con bucles de tools más largos pueden chocar con límites de duración y no sobreviven entre isolates; valorar Durable Object o Queue.
- No verificado por falta de datos en las páginas oficiales consultadas: contexto de Gemini, OpenAI y casi todo Workers AI; tool calling exacto de gemma/mistral-small-3.1 en Workers AI; políticas de datos de OpenAI/Anthropic/Google/Mistral; estado de `gemini-3.5-flash`.

## Fuentes

- Gemini precios: https://ai.google.dev/gemini-api/docs/pricing
- DeepSeek precios/modelos: https://api-docs.deepseek.com/quick_start/pricing/
- Anthropic precios: https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic modelos: https://platform.claude.com/docs/en/about-claude/models/overview
- OpenAI precios: https://developers.openai.com/api/docs/pricing
- Mistral Small 4: https://docs.mistral.ai/models/mistral-small-4-0-26-03 y https://mistral.ai/pricing
- Workers AI precios: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Workers AI modelos: https://developers.cloudflare.com/workers-ai/models/
- Workers AI function calling: https://developers.cloudflare.com/workers-ai/features/function-calling/
- Vectorize precios: https://developers.cloudflare.com/vectorize/platform/pricing/
- AI Gateway: https://developers.cloudflare.com/ai-gateway/ , https://developers.cloudflare.com/ai-gateway/reference/pricing/ , https://developers.cloudflare.com/ai-gateway/configuration/fallbacks/ , https://developers.cloudflare.com/ai-gateway/usage/chat-completion/
- DeepSeek y GDPR (prensa): https://therecord.media/italy-blocks-chinese-ai-tool-deepseek-over-privacy-concerns , https://cyberinsider.com/europe-cracks-down-on-deepseek-over-data-privacy-concerns/ , https://www.techradar.com/computing/cyber-security/deepseek-faces-ban-in-germany-as-privacy-watchdog-reports-the-app-to-google-and-apple-as-illegal-content

## 8. Comparativa revisada (2026-10-23, precios comprobados en las páginas oficiales)

Criterio del propietario: app personal, prima el precio, GDPR no es relevante.

Tokens por mensaje medidos sobre el código actual: persona fija 3.585 caracteres (~1.100 tokens) + análisis + historial. Tres escenarios, salida ~800 tokens:
- **Corto** 3.000 tokens de entrada (conversación nueva, pocos entrenos)
- **Típico** 5.500 tokens de entrada
- **Largo** 10.000 tokens de entrada (historial largo)

Coste por **1.000 mensajes** (USD, sin caché):

| Modelo | $/MTok entrada / salida | Corto | Típico | Largo |
|---|---|---|---|---|
| Gemini 3.6/3.8 Flash (equivalente al actual) | 0,75 / 3,75 | 5,25 | 7,13 | 10,50 |
| Ídem desde 1-ene-2027 | 1,50 / 7,50 | 10,50 | 14,25 | 21,00 |
| Claude Haiku 4.5 | 1,00 / 5,00 | 7,00 | 9,50 | 14,00 |
| DeepSeek V4.1 Flash, hora punta | 0,30 / 1,20 | 1,86 | 2,61 | 3,96 |
| Gemini 3.1 Flash-Lite | 0,25 / 1,50 | 1,95 | 2,58 | 3,70 |
| DeepSeek V4.1 Flash, fuera de punta | 0,15 / 0,60 | 0,93 | 1,31 | 1,98 |
| Claude Haiku 5.5 | 0,10 / 0,50 | 0,70 | 0,95 | 1,40 |
| Gemini 2.5 Flash-Lite (modelo antiguo) | 0,10 / 0,40 | 0,62 | 0,87 | 1,32 |

Con caché (70 % de la entrada repetida, escenario típico): DeepSeek punta 1,48 · DeepSeek fuera de punta 0,74 · Haiku 5.5 ~0,62 · Gemini 2.5 Flash-Lite ~0,40.

Horas punta de DeepSeek: 01–04 y 06–10 UTC de lunes a viernes, es decir 03–06 y 08–12 hora peninsular en verano. Por la tarde, noche y fines de semana siempre se paga la tarifa reducida.

Uso personal estimado: 600 mensajes al mes (20 al día), escenario típico con caché. DeepSeek ~0,45 $/mes · Haiku 5.5 ~0,37 $/mes · Gemini Flash actual ~4,3 $/mes (~8,6 $ desde enero).

Advertencias: cada proveedor tokeniza distinto (±15 %); si el modelo "piensa", esos tokens se cobran como salida; `gemini-3.5-flash` (el modelo del código) ya no aparece en la tabla oficial de precios.

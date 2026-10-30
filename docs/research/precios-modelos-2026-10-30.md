# Precios de modelos para el coach (revisión 2026-10-30)

Motivo: Haiku 5.5 se queda corto en calidad de respuesta. Precios USD por 1M tokens, tier estándar, leídos de las páginas oficiales hoy. Coste por 1.000 mensajes con el perfil de `modelo-ia.md` (5,5M tokens de entrada y 0,8M de salida; «con caché» = 70 % de la entrada leída de caché, sin contar el razonamiento).

| Modelo | Entrada / Salida / Caché | Sin caché | Con caché | Por mensaje |
|---|---|---|---|---|
| Claude Haiku 5.5 (actual) | 0,10 / 0,50 / 0,01 | 0,95 $ | 0,59 $ | 0,06–0,10 ¢ |
| OpenAI gpt-6-luna | 0,10 / 0,50 / 0,01 | 0,95 $ | 0,59 $ | 0,06–0,10 ¢ |
| Gemini 3.5 Flash-Lite | 0,30 / 2,50 / 0,03 | 3,65 $ | 2,57 $ | 0,26–0,37 ¢ |
| DeepSeek V4.1 Flash (hora punta) | 0,30 / 1,20 / 0,006 | 2,61 $ | 1,43 $ | 0,14–0,26 ¢ |
| DeepSeek V4 Pro (hora punta) | 1,32 / 3,96 / 0,044 | 10,43 $ | 5,32 $ | 0,5–1,0 ¢ |
| OpenAI gpt-5.4-mini | 0,75 / 4,50 / 0,075 | 7,73 $ | 5,01 $ | 0,5–0,8 ¢ |
| Gemini 3.8 Flash (sube x2 el 1-ene-2027) | 0,75 / 3,75 / 0,075 | 7,13 $ | 4,41 $ | 0,4–0,7 ¢ |
| OpenAI gpt-6.1-terra | 1 / 5 / 0,05 | 9,50 $ | 5,69 $ | 0,6–1,0 ¢ |
| **Claude Sonnet 5.5** | 2 / 10 / 0,10 | 19,00 $ | 11,39 $ | 1,1–1,9 ¢ |
| OpenAI gpt-6.1-sol | 2 / 10 / 0,10 | 19,00 $ | 11,39 $ | 1,1–1,9 ¢ |
| OpenAI gpt-5.6-terra | 2 / 12 / 0,20 | 20,60 $ | 13,37 $ | 1,3–2,1 ¢ |
| Gemini 3.1 Pro (preview) | 2 / 12 / 0,20 | 20,60 $ | 13,37 $ | 1,3–2,1 ¢ |
| Claude Opus 5.5 | 4 / 20 / 0,20 | 38,00 $ | 22,80 $ | 2,3–3,8 ¢ |
| Claude Fable 5.1 | 10 / 50 / 0,25 | 95,00 $ | 55,96 $ | 5,6–9,5 ¢ |

Con 100 usuarios y 30 mensajes al mes (3.000 mensajes): Haiku ≈ 2–3 $/mes, Sonnet 5.5 ≈ 34–57 $/mes, Opus 5.5 ≈ 68–114 $/mes. El razonamiento (thinking) se factura como salida y puede sumar +2.000 tokens por mensaje (+20 $ por 1.000 en Sonnet), así que conviene mantener `LLM_THINKING=off` o esfuerzo bajo.

Cambiar de modelo en Claude es solo `LLM_MODEL` (por ejemplo `claude-sonnet-5-5`); el adaptador ya existe.

Fuentes: platform.claude.com/docs/en/about-claude/pricing, developers.openai.com/api/docs/pricing, ai.google.dev/gemini-api/docs/pricing, api-docs.deepseek.com/quick_start/pricing.

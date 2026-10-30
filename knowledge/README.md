# Base de conocimiento del coach (fichas RAG)

**Estado: borradores pendientes de revisión.** Las fichas se han redactado con IA a partir de las notas de `research_notes/RAG entrenamiento de musculación/`, sin búsqueda nueva. Hay que revisarlas antes de empaquetarlas en el Worker. Las fuentes, su estado de verificación y los huecos están en `docs/research/rag-fuentes.md`.

## Para qué sirven
Cada ficha es un fragmento corto que el coach recibe en su contexto. Se eligen por etiquetas (enfoque de la sesión, músculos, nivel, lesiones activas de la memoria), 2-4 por mensaje y con un tope de ~800 tokens de conocimiento. Por eso cada cuerpo tiene unas 180 palabras como máximo. Ver `docs/PLAN.md`, apartado "C · Cerebro de conocimiento de entrenamiento (RAG)".

## Formato
Un archivo Markdown por ficha. El nombre del archivo (sin `.md`) es el `id`.

```
---
id: <kebab-case, igual que el nombre del archivo>
titulo: <título corto>
objetivo: [...]
musculo: [...]      # [] si es general
nivel: [...]
tema: [...]
lesion: [...]       # [] si no aplica
evidencia: alta | moderada | baja | opinion
---
**Qué hacer:** 2-5 viñetas con las reglas prácticas (series, RIR, segundos, %1RM cuando hay base).
**Por qué:** 1-3 frases con la evidencia.
**Matices:** límites de población, análisis exploratorios, qué es opinión o inferencia.
**Fuentes:** referencias cortas (autor año, revista, DOI o PMID).
```

## Vocabulario de etiquetas
| Campo | Valores |
|---|---|
| `objetivo` | hipertrofia, fuerza, resistencia, salud |
| `musculo` | pecho, espalda, hombro, biceps, triceps, cuadriceps, isquios, gluteo, gemelo, core |
| `nivel` | principiante, intermedio, avanzado |
| `tema` | volumen, frecuencia, intensidad, fallo, descanso, seleccion, tecnica, progresion, periodizacion, variedad, division, dolor, formato |
| `lesion` | hombro, rodilla, lumbar, codo |
| `evidencia` | alta, moderada, baja, opinion |

Los valores van sin tildes para que el filtrado sea sencillo. `evidencia` resume la ficha entera; cuando una parte es más débil (p. ej. una pauta de opinión dentro de una ficha moderada), se indica en **Matices**.

## Reglas de redacción
- En castellano, con palabras propias (sin copiar texto de las fuentes).
- Solo lo que dicen las notas. Lo que es opinión de expertos o inferencia se marca como tal.
- Fichas de dolor: principios generales de entrenamiento, nunca diagnóstico ni tratamiento, y siempre cuándo acudir a un profesional. La ficha `dolor-principios-y-banderas-rojas` lleva todas las etiquetas de `lesion` para que acompañe a cualquier ficha de molestias.

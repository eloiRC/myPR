# Plan de MyPR

Estado a 2026-10-23 (actualizado). Se actualiza al cerrar cada bloque.

## Hecho
- **1a** Marcar serie hecha en la vista de lista (estado compartido con tarjetas).
- **1b** Jobs del chat en D1, envío idempotente, refresco siempre al terminar.
- **2** Formulario único de serie (crear/editar, lista y tarjetas), tarjeta grande, recordar vista y tarjeta por entreno.
- **3** Temporizador de descanso (barra, ±15 s, aviso al terminar).
- **4** Modelo de IA: Claude Haiku 5.5 por defecto; GPT-6 Luna preparado (`LLM_PROVIDER`). Ver `docs/research/modelo-ia.md`.
- **5** La IA actúa con herramientas: series, entreno, ejercicios.
- **6** Memoria del entrenador: la IA la mantiene y el usuario la edita directamente en Ajustes. "Personalizar el entrenador IA" eliminado (su texto pasó a la memoria).
- **Descansos** en 3 niveles, por orden de prioridad: serie → ejercicio → global. En serie y ejercicio, `null` hereda del nivel siguiente y `0` = sin descanso (el temporizador no arranca). Los pone sobre todo la IA, y solo por serie cuando aporta algo. Los ajustes del temporizador se guardan en la cuenta.
- **Deshacer al borrar** (series, entrenos y memorias): sale al instante y se confirma a los 6 s; sustituye a `confirm()`.
- **Reordenar series arrastrando en el móvil** (asa ⠿) y **navegación inferior** (Entrenos / Ejercicios / Perfil; «Cerrar sesión» pasó a Perfil).
- Eliminada la integración con Garmin: código, workflow, scripts, tablas de D1 (migración 0006) y secretos.

## Pendiente
### Entrevista inicial con el entrenador IA (por definir)
Botón en Ajustes, del tipo "Hacer entrevista con mi entrenador". La IA hace una entrevista como la de un entrenador personal y, con las respuestas, rellena y ajusta su memoria: objetivos, lesiones, experiencia, disponibilidad, material y preferencias.

Ideas a decidir:
- formato: chat guiado con preguntas una a una, o formulario corto más preguntas de seguimiento;
- qué hacer con la memoria existente: revisarla con el usuario, actualizar o añadir;
- repetirla cada cierto tiempo, por ejemplo una revisión trimestral de objetivos;
- resumen final para confirmar antes de guardar.

### 7 · "Cerebro" con información fiable (RAG)
Base de conocimiento curada (programación, volumen, progresión, ejercicios por objetivo), con Vectorize y embeddings de Workers AI. Decidir antes las fuentes.

### 8 · Biblioteca de ejercicios con imágenes (aparcado)
Recomendado: free-exercise-db (dominio público). Ver `docs/research/biblioteca-ejercicios.md`. Incluye corregir los nombres de los grupos musculares en producción.

### Otros
- Agrupar series por ejercicio en entrenos largos.

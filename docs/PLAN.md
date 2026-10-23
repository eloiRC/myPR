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
- Base de datos movida a Europa: `mypr-eu` (WEUR) en lugar de `mypr` (WNAM, EE. UU.). La antigua se conserva unos días como respaldo antes de borrarla.
- Chat: generación en Cloudflare Queues, fases en vivo, retomar tras bloqueo, respuestas rápidas, contexto compacto y menos llamadas al modelo (`LLM_THINKING=off`).
- Eliminada la integración con Garmin: código, workflow, scripts, tablas de D1 (migración 0006) y secretos.

## Próxima sesión

Orden recomendado: **A → B → C**. A y B se pueden hacer en paralelo, porque tocan zonas distintas. C (RAG) es independiente.

### A · UI/UX de la página de entreno y del chat
Primero una crítica de diseño (`/impeccable critique`) de la página de entreno y del chat, con medidas reales en el móvil. Después, mejoras por prioridad. Candidatas:

**Página de entreno**
- **Agrupar series por ejercicio**: una cabecera por ejercicio, filas compactas `80×8 · 80×8 · 82,5×6`, número de serie y check de hecha.
- **"Repetir serie"** en un toque, en la última serie de cada ejercicio.
- **Cabecera de progreso**: "5 de 12 series", tiempo de sesión y ejercicio actual.
- **Terminar entreno**: resumen final con volumen, PRs conseguidos y comparación con la sesión anterior.
- **Deshacer** al borrar (aviso con "Deshacer" 5 s) en lugar de `confirm()`.
- **Reordenar en móvil** (arrastrar no funciona en táctil).
- **Navegación inferior**: Entrenos / Ejercicios / Perfil.

**Chat**
- Pantalla completa en móvil, con el campo de texto siempre visible sobre el teclado.
- **Tarjetas de cambios aplicados**: cuando la IA añade o edita series, mostrar una tarjeta "Añadidas 4 series de Sentadilla" con "Deshacer".
- Revisar cómo se ven los estados (Pensando…, Añadiendo…) y las respuestas rápidas en producción.
- Tablas legibles en el markdown (los planes de entreno).
- Opcional: dictado por voz (Web Speech API) para usarlo entre series.

### B · Entrevista inicial con el entrenador IA
- **Dónde**: botón en Ajustes, "Entrevista con tu entrenador". También se ofrece al primer uso si la memoria está vacía.
- **Formato** (propuesta): chat guiado con **una pregunta a la vez** y **respuestas rápidas** (botones) cuando haya opciones típicas.
- **Temas**: objetivo principal, experiencia, días y tiempo disponibles, material o gimnasio, lesiones y molestias, ejercicios preferidos y a evitar, estilo de entreno.
- **Cierre**: resumen final para que el usuario lo confirme o corrija. Al confirmar, la IA guarda o actualiza la memoria con sus herramientas.
- **Técnico**: modo "entrevista" del coach (otro prompt de sistema, sin entreno asociado). Reutiliza las colas, las fases, las respuestas rápidas y las herramientas de memoria.
- **Por decidir**: si se repite cada cierto tiempo (revisión trimestral) y qué hacer con la memoria existente (revisar, actualizar o añadir).

### C · "Cerebro" de conocimiento de entrenamiento (RAG)
Objetivo: respuestas mejor fundamentadas (programación, volumen, progresión, técnica, ejercicios por objetivo, adaptaciones ante molestias) **sin añadir latencia** ni consultas a la web.

1. **Base de conocimiento propia** en el repo (`knowledge/*.md`): fichas cortas escritas o resumidas por nosotros (no texto copiado). Cada ficha lleva etiquetas: objetivo, grupo muscular, nivel, tipo de sesión, lesión.
   - Temas iniciales: volumen semanal por grupo, rangos de reps y descansos por objetivo, progresión (doble progresión, RIR/RPE), periodización y descargas, selección de ejercicios por músculo, sustituciones ante molestias (hombro, rodilla, lumbar), calentamiento y aproximaciones.
2. **Precompilado**: un script genera `knowledge.json` con los fragmentos y sus etiquetas, empaquetado con el Worker, sin servicios externos.
3. **Recuperación en dos fases**:
   - **Fase 1, sin latencia**: selección por etiquetas según el enfoque de la sesión, los músculos más descansados y las lesiones activas de la memoria. Se añaden 2–4 fragmentos al contexto volátil.
   - **Fase 2, solo si hace falta**: búsqueda semántica con embeddings de Workers AI y Vectorize para preguntas abiertas ("¿cómo mejoro mi press banca?"). Unos 50–150 ms y coste casi nulo.
4. **Control de tamaño**: tope de unos 800 tokens de conocimiento por mensaje. Medir con `[coach-usage]`.
5. **Por decidir**: quién redacta las fichas. Propuesta: borrador con IA a partir de fuentes reconocidas y revisión tuya.

### Mantenimiento pendiente
- Borrar la base de datos antigua `mypr` (WNAM) cuando se confirme que `mypr-eu` va bien.
- Medir los tiempos del chat tras las últimas optimizaciones (`[coach-timing]`) y decidir si `LLM_THINKING` sigue en `off`.
- Borrar el secreto `GEMINI_API_KEY`, que ya no se usa.
- Limpiar los worktrees de agentes en `.claude/worktrees/` y el archivo suelto `0` de la raíz.

## Pendiente
### Entrevista inicial
Ver "Próxima sesión · B".

### RAG
Ver "Próxima sesión · C".

### 8 · Biblioteca de ejercicios con imágenes (aparcado)
Recomendado: free-exercise-db (dominio público). Ver `docs/research/biblioteca-ejercicios.md`. Incluye corregir los nombres de los grupos musculares en producción.

### Otros
- Agrupar series por ejercicio en entrenos largos.

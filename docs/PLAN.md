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

- **Rediseño UX/UI completo mobile-first** (2026-10-24), en dirección "marcador LED de competición":
  - números de 7 segmentos, ámbar solo para lo accionable, pilotos de jueces para hechas y PR;
  - barra inferior y hojas inferiores;
  - entreno con la serie actual en grande, series agrupadas por ejercicio, repetir serie, pulsación larga para reordenar, resumen al terminar;
  - chat a pantalla completa;
  - fuentes autoalojadas;
  - sistema documentado en `DESIGN.md`.
  - ajustes tras la primera revisión (2026-10-24): «Nuevo entreno» arriba en la lista, series agrupadas solo por tramos consecutivos (respeta el orden real), entrenador solo dentro del entreno, tarjetas sin pilotos ni paginación inferior, tira superior como navegación, descanso en la banda, tiempo de sesión en Datos y ambos relojes persistentes tras recargar.
  Hecho en autónomo: los supuestos están en `PRODUCT.md`.

## Próxima sesión

Orden recomendado: **A (rediseño) → B → C**. B (entrevista) conviene hacerlo ya con el diseño nuevo del chat. C (RAG) es independiente y puede ir en paralelo.

### A · Rediseño UX/UI completo, mobile-first — HECHO (ver arriba); quedan los pendientes de abajo
No son retoques: rediseño de toda la app pensado primero para el móvil en el gimnasio (una mano, sudado, entre series, a veces con mala cobertura). El aspecto actual sirve solo como referencia de lo que funciona y de lo que no.

**Proceso** (skill de diseño `impeccable`):
1. **Contexto de producto** (`PRODUCT.md`): entrevista corta sobre quién la usa, cuándo, objetivos, tono y referencias que te gustan o no.
2. **Dirección visual**: 2–3 propuestas de estilo (tipografía, color, densidad, iconos y movimiento) con maquetas de la pantalla de entreno. Eliges una.
3. **Sistema de diseño** (`DESIGN.md` y tokens): colores, tipografía, espaciado, componentes (botones, tarjetas, formularios, chips, hojas inferiores) y estados.
4. **Estructura y navegación**: navegación inferior (Entrenos / Ejercicios / Perfil), hojas inferiores en lugar de modales y gestos donde aporten.
5. **Pantallas, por prioridad**:
   1. Entreno: registrar series, tarjetas, progreso de la sesión, temporizador y terminar con resumen.
   2. Chat del entrenador.
   3. Lista de entrenos.
   4. Ejercicios y detalle.
   5. Ajustes y memoria.
   6. Login y registro.
6. **Verificación** en el móvil real y simulado: velocidad, accesibilidad (contraste, objetivos táctiles de 44 px), modo claro u oscuro según el uso real, y pruebas.

**Ideas que ya sabemos que entran** (de la revisión anterior):
- Series agrupadas por ejercicio.
- "Repetir serie" en un toque.
- Cabecera de progreso.
- Resumen al terminar con PRs.
- Deshacer al borrar.
- Chat a pantalla completa.
- Tarjetas de "cambios aplicados" con deshacer.
- Iconos de verdad en lugar de emojis.
- **Reordenar series con pulsación larga y arrastrar** (sin el botón ⠿): mantener ~0,45 s levanta la tarjeta con vibración; si el dedo se mueve antes, es scroll normal; desplazamiento automático cerca de los bordes; un toque corto sigue marcando la serie como hecha. Hay un prototipo descartado de esta sesión que sirve de referencia.

**Reparto**: dirección y sistema de diseño en la sesión principal (decisiones contigo). Las pantallas, por agentes en paralelo una vez fijado el sistema, revisadas y probadas antes de publicar.

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
- Pulido del rediseño (inconsistencias que encontró el documentador):
  - **estado "fallida"**: no existe todavía;
  - **sombras**: `--shadow-sm` y `--shadow-md` son sombras duras;
  - **colores sueltos**: `.error-message` aún usa un rojo antiguo; el tooltip de las gráficas usa un azulado fuera de la escala de neutros; quedan dos colores sin pasar a tokens;
  - **restos sin uso**: CSS (`.toast-pr`, `.pr-valor`) y tokens antiguos (`--color-teal`…, `--radius-xl`, `--radius-full`, `--shadow-glow`);
  - **aviso de PR**: lleva un rótulo encima del nombre del ejercicio.
- Decidir si se quiere tema claro (de momento solo oscuro, por la escena del gimnasio).
- Récords: corregir en origen la columna `Exercici.PR` desfasada (la app ya muestra el máximo real) y llamar a `checkPr` al borrar un entreno.
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

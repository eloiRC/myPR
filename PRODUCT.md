# Product

<!-- impeccable:product-schema 1 -->

> Escrito sin entrevista: el propietario pidió ejecutar el rediseño de forma autónoma. Las líneas marcadas *(supuesto)* se infirieron de la conversación y del código y están pendientes de confirmar.

## Platform

web

PWA instalable (vite-plugin-pwa), usada sobre todo en el móvil.

## Users

- **Usuario principal:** una persona que entrena fuerza o hipertrofia en el gimnasio y registra sus series. Es el propietario del proyecto y un pequeño grupo de usuarios (14 cuentas en producción).
- **Situación:** en el gimnasio, entre series, con el móvil en una mano, a veces con las manos sudadas, con prisa y con cobertura irregular. También lo usa en casa para revisar progreso y hablar con el entrenador IA *(supuesto: uso de revisión fuera del gimnasio)*.
- **Trabajo:** apuntar cada serie (ejercicio, kg, reps) en segundos, marcarla como hecha, descansar lo justo, ver si ha batido un récord y pedir al entrenador IA qué hacer hoy.

## Product Purpose

MyPR es un registro de entrenos de fuerza con un entrenador IA integrado. Sirve para apuntar series rápido, ver la progresión por ejercicio y recibir propuestas de entreno adaptadas al historial, la memoria del usuario (lesiones, objetivos, preferencias) y los descansos.

El éxito es que registrar una serie lleve un par de toques, que el usuario vea su progreso y sus PRs, y que el entrenador proponga sesiones variadas y bien fundamentadas que la app aplica sola.

## Positioning

El entrenador IA actúa dentro del entreno: añade, edita y borra series con herramientas, fija descansos por serie o ejercicio, recuerda lesiones y objetivos (memoria editable por el usuario) y varía las propuestas a partir de un análisis del historial (frescura por músculo, estancamientos, rotación). No es un chat aparte del registro: es la misma pantalla.

## Operating Context

- Flujo principal: lista de entrenos → entreno del día → añadir series (formulario con ±), marcar hechas (toque), temporizador de descanso, chat con el entrenador.
- Dos vistas del entreno: **lista** y **tarjetas** (una serie a pantalla casi completa, con swipe).
- El chat responde con fases visibles (Pensando…, Añadiendo series…) y botones de respuesta rápida.
- Ajustes: temporizador de descanso por cuenta y memoria del entrenador editable.

## Capabilities and Constraints

- Frontend: Vue 3 + TypeScript + Vite, PWA. Backend: Cloudflare Worker (Hono) + D1 (Europa) + Queues. IA: Claude Haiku 5.5 (GPT-6 Luna preparado).
- Idioma: español.
- Datos: entrenos, series (kg, reps, carga, PR, hecha, descanso), ejercicios del usuario con grupos musculares, memoria del entrenador.
- Gráficas con Chart.js.
- Biblioteca de ejercicios con imágenes: aparcada (sin imágenes de ejercicios por ahora).
- Garmin/Strava: eliminado, no vuelve a corto plazo.

## Brand Commitments

- Nombre: **MyPR**.
- Tono: directo, técnico, sin relleno; el entrenador habla en español, conciso.
- Orientado a móvil: el propietario pidió explícitamente un rediseño "full enfocado a móvil".
- Preferencias de interacción confirmadas por el propietario:
  - reordenar series con **pulsación larga y arrastrar**, sin botón de mover;
  - respuestas rápidas en el chat cuando la IA propone algo;
  - el historial del chat se borra cada día.

## Evidence on Hand

- Datos reales de uso en producción (no se publican).
- Sin capturas de marketing, testimonios ni imágenes de ejercicios: no inventarlos.

## Product Principles

1. **Registrar en segundos.** Cada acción frecuente (añadir, repetir, marcar hecha) cabe en un toque o dos con el pulgar.
2. **El entreno manda.** La pantalla del entreno es el centro; el chat y las estadísticas la sirven, no compiten con ella.
3. **El récord se celebra.** Un PR es el momento emocional de la app y se nota.
4. **Nada se pierde.** Respuestas del entrenador, series y posición se conservan aunque se cierre la app o se pierda la cobertura.
5. **Claridad antes que adorno.** Lectura rápida bajo luz de gimnasio y con prisa.

## Accessibility & Inclusion

- Objetivos táctiles de al menos 44 px; uso con una mano.
- Contraste AA o superior: se lee a distancia de brazo y bajo luz fuerte o tenue *(supuesto)*.
- Respetar `prefers-reduced-motion`.

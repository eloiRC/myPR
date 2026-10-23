---
version: 1
slug: "mypr-fr-src-views-detalleentreno-vue"
primary_target: "mypr-fr/src/views/DetalleEntreno.vue"
related_targets: ["mypr-fr/src/App.vue","mypr-fr/src/components/Chatbot.vue","mypr-fr/src/views/Entrenos.vue"]
---

# Superficie: app MyPR (rediseño completo, mobile-first) · primera superficie: entreno del día

Modo: Operate. Quien la usa: el levantador entre series, móvil en una mano, en el gimnasio. Tarea: registrar series (kg × reps), marcarlas hechas, descansar, ver PRs y pedir al entrenador IA. Restricciones: 44 px mínimos, una mano, contraste alto, sin imágenes de ejercicios, sin emojis como iconos.

Decisiones tomadas sin entrevista (el propietario pidió ejecutar en autónomo): dirección asignada por el sorteo y presentada ya con sus mejoras; tema oscuro fijo justificado por la escena.

## Direction contract

THESIS: El entreno es el marcador del rack. Kg, reps, tiempo de descanso y progreso se leen como en un reloj LED de competición: números de segmentos enormes, legibles a un brazo de distancia. Rechaza el panel oscuro con acento neón brillante y la app de fitness blanca de tarjetas redondeadas.

OWN-WORLD: Carcasa negra mate (#0d0e10) con paneles de chapa grafito y biseles de 1 px; esquinas casi rectas (4 px). Números en display de 7 segmentos dibujado (no fuente), con los segmentos apagados visibles al 7 %. Ámbar LED = vivo o accionable (y nada más). Rojo LED = alarma o borrar. Blanco de jueces = hecha / buena. Sin brillo ni halos. Texto en Barlow Condensed (rótulos, mayúsculas espaciadas) y Barlow (cuerpo). Iconos lineales de un solo grosor (Lucide).

STORY: El usuario abre el entreno y ve al instante qué toca, cuánto lleva y cuánto descansa. Apunta o repite una serie con un toque, la marca hecha y, cuando bate un récord, los tres pilotos de jueces se encienden en blanco. El entrenador vive en una hoja inferior.

FIRST VIEWPORT: Arriba, una banda-marcador: nombre del entreno, "SERIES 5/12" y el tiempo de sesión en segmentos. Debajo, el ejercicio actual como bloque grande: nombre en Barlow Condensed y la próxima serie "82,5 × 8" en segmentos ámbar a todo el ancho, con [Hecha] y [Repetir] al alcance del pulgar. Abajo, la barra de navegación (Entreno · Ejercicios · Entrenador · Perfil) y, cuando corre un descanso, el reloj de descanso en segmentos rojos sobre ella.

FORM: Marcador LED de competición (reloj de rack, tarjetas de intento y pilotos de jueces); posición 6 de 7 en la lista ordenada; seed c5b2c985.
- Mejora tomada de "App de consumo cálida (canon)": el ámbar se reserva estrictamente a lo accionable o en curso; la barra inferior queda siempre al alcance del pulgar.
- Mejora tomada de "Rejilla de Crouwel": los números son el elemento monumental, y sus segmentos apagados quedan a la vista como construcción.
- Mejora tomada de "Labanotation": la duración es longitud; el descanso y la sesión se dibujan como barras proporcionales.
- Mejora tomada de "Plano de metro": vocabulario de estado fijo y único en toda la app: pendiente · en curso · hecha · PR · fallida.
- Mejora tomada de "Exposure record": los neutros salen de una escala tonal fija de 9 pasos; nada de grises sueltos.

Interacción firma: al marcar un PR, los tres pilotos de jueces se encienden en blanco en secuencia (respeta reduced-motion) y los dígitos de la serie parpadean dos veces.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Pendiente de confirmar
- Tema claro: descartado por la escena; revisar si el propietario lo quiere para uso de día.
- Reordenar con pulsación larga y arrastrar (preferencia confirmada del propietario).

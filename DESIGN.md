---
name: MyPR
description: Registro de entrenos de fuerza con entrenador IA, leído como el marcador LED de un rack de competición.
colors:
  n0: "#0d0e10"
  n1: "#141518"
  n2: "#1b1d21"
  n3: "#262a2f"
  n4: "#353a41"
  n5: "#4d535b"
  n6: "#8a9099"
  n7: "#b9bec5"
  n8: "#eef0f2"
  led-amber: "#ffb020"
  led-amber-hover: "#ffc24f"
  led-amber-dim: "rgba(255, 176, 32, 0.12)"
  on-amber: "#1d1200"
  led-red: "#ff4a3d"
  led-red-dim: "rgba(255, 74, 61, 0.12)"
  judge-white: "#f4f6f7"
typography:
  display:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 6vw, 2.1rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.02em"
  headline:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 7vw, 2.2rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0.03em"
  title:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Barlow', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  figure:
    fontFamily: "'Barlow', system-ui, -apple-system, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: "tnum"
  label:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
  button:
    fontFamily: "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.06em"
rounded:
  sm: "3px"
  md: "4px"
  lg: "6px"
spacing:
  page-x: "1rem"
  footer: "1.5rem"
  touch-min: "44px"
  bottom-nav: "3.75rem"
  max-content: "44rem"
components:
  button-primary:
    backgroundColor: "{colors.led-amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.1rem"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.led-amber-hover}"
  button-secondary:
    backgroundColor: "{colors.n1}"
    textColor: "{colors.n8}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.1rem"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.n2}"
  button-danger:
    backgroundColor: "{colors.led-red-dim}"
    textColor: "{colors.led-red}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1.1rem"
    height: "44px"
  button-quiet-danger:
    backgroundColor: "transparent"
    textColor: "{colors.led-red}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.n0}"
    textColor: "{colors.n8}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem"
  panel:
    backgroundColor: "{colors.n1}"
    textColor: "{colors.n8}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  readout:
    backgroundColor: "{colors.n0}"
    textColor: "{colors.led-amber}"
    rounded: "{rounded.md}"
    padding: "0.45rem 0.75rem 0.55rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.n7}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 0.5rem"
  chip-filter-active:
    backgroundColor: "{colors.led-amber}"
    textColor: "{colors.on-amber}"
    rounded: "{rounded.sm}"
  pr-tag:
    backgroundColor: "transparent"
    textColor: "{colors.judge-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 0.4rem"
  nav-item:
    backgroundColor: "{colors.n0}"
    textColor: "{colors.n6}"
    height: "3.75rem"
  nav-item-active:
    textColor: "{colors.led-amber}"
  bottom-sheet:
    backgroundColor: "{colors.n1}"
    textColor: "{colors.n8}"
    rounded: "{rounded.md}"
    padding: "1rem"
---

# Design System: MyPR

## Overview

**Creative North Star: "El marcador del rack"**

MyPR se lee como el reloj LED de una competición de fuerza montado en el rack: una carcasa negra mate con paneles de chapa grafito, cifras de siete segmentos dibujadas que se leen a un brazo de distancia, y tres pilotos de jueces que se encienden en blanco cuando la marca es buena. Todo está pensado para el gimnasio: una mano, el móvil apoyado, manos sudadas, prisa entre series. El tema es oscuro y fijo (`color-scheme: dark`).

La densidad es la de un instrumento, no la de una app de tarjetas: rótulos condensados en mayúsculas espaciadas nombran cada lectura, las cifras son el elemento monumental (la serie actual ocupa el 88 % del ancho útil), y el resto es chapa neutra. La profundidad viene de biseles de 1 px y alojamientos hundidos, no de luz. Hay tres luces de señal y cada una significa una sola cosa.

El sistema rechaza explícitamente el panel oscuro con acento neón brillante (sin halos ni degradados) y la app de fitness blanca de tarjetas redondeadas (esquinas de hardware de 3 a 6 px).

**Key Characteristics:**
- Carcasa negra mate y escala tonal fija de 9 pasos; no hay grises sueltos.
- Tres pilotos con significado único: ámbar vivo/accionable, rojo alarma/borrar/descanso, blanco de jueces hecha/válida/PR.
- Cifras en display de 7 segmentos dibujado en SVG, con los segmentos apagados visibles.
- Barlow Condensed para rótulos y botones, Barlow para cuerpo y cifras de texto.
- Esquinas casi rectas, bisel superior de 1 px, nada de brillo.
- Hojas inferiores en lugar de modales; todo control táctil mide 44 px o más.

## Colors

Una carcasa de neutros fríos casi negros con tres luces de señal saturadas que solo se encienden cuando significan algo.

### Primary
- **Ámbar LED** (`led-amber`): lo vivo o accionable y nada más. Botón principal ("Hecha"), cifras de la serie en curso, tiempo de sesión, pestaña activa de la navegación, filtro o segmento seleccionado, foco de teclado (contorno de 2 px), cursor y selección de texto. Su hover es **Ámbar Encendido** (`led-amber-hover`); el texto sobre ámbar es **Ámbar Quemado** (`on-amber`), nunca blanco. **Ámbar Tenue** (`led-amber-dim`) marca el destino al soltar una fila arrastrada.

### Secondary
- **Rojo LED** (`led-red`): alarma, error, borrar y descanso. La cuenta atrás del descanso y su barra de progreso, los errores de formulario y chat, el botón de borrar. **Rojo Tenue** (`led-red-dim`) es el relleno de los botones y avisos destructivos.

### Tertiary
- **Blanco de Jueces** (`judge-white`): hecha, válida, récord. Los pilotos encendidos, la luz de serie hecha, las celdas hechas de la tira de progreso, el recuento de series hechas en el marcador, la etiqueta PR y la tarjeta de récord. No es el color de texto: el texto usa `n8`.

### Neutral
- **Carcasa** (`n0`): fondo de la app, barra de navegación, interior de campos y de los displays hundidos.
- **Chapa** (`n1`): paneles, filas, hojas inferiores, botón secundario.
- **Chapa Pulida** (`n2`): hover de filas y botones fantasma; panel de la serie actual y fondo de la tarjeta de récord; pilotos apagados.
- **Junta** (`n3`): borde por defecto de paneles y divisores; segmentos vacíos de las barras de progreso.
- **Junta Marcada** (`n4`): borde de campos, chips y botón secundario; asa de la hoja.
- **Remache** (`n5`): borde en hover del secundario, aro de la serie pendiente, rótulo apagado.
- **Serigrafía** (`n6`): rótulos, metadatos, unidades, iconos de navegación inactivos, texto de ejes de gráficas.
- **Serigrafía Clara** (`n7`): texto secundario, iconos de acción, chips, datos de la gráfica.
- **Pantalla** (`n8`): texto principal y títulos.

### Named Rules
**The One Meaning Rule.** Cada luz significa una sola cosa en toda la app. Ámbar es vivo o accionable; rojo es alarma, borrar o descanso; blanco de jueces es hecha, válida o PR. Si un elemento no es ninguna de esas cosas, es neutro.

**The Nine Steps Rule.** Los neutros salen solo de `n0`..`n8`. Un gris que no está en la escala es un defecto.

**The Grey Data Rule.** Los datos de las gráficas se dibujan en `n7` y los récords en blanco de jueces; el ámbar no pinta datos porque no son accionables.

## Typography

**Display Font:** Barlow Condensed (con Arial Narrow, system-ui)
**Body Font:** Barlow (con system-ui, -apple-system)

**Character:** La condensada es la serigrafía del aparato: rótulos y botones en mayúsculas espaciadas, estrechos para caber en un panel. Barlow, de la misma familia, lleva el cuerpo y las cifras de texto con números tabulares. Ambas están autoalojadas (pesos 400 a 700 de Barlow, 500 a 700 de la condensada, subconjunto latino) y precacheadas por el PWA para que sin cobertura no caiga a una fuente del sistema.

### Hierarchy
- **Display** (700, clamp(1.6rem, 6vw, 2.1rem), 1.05, mayúsculas): título de página.
- **Headline** (700, clamp(1.6rem, 7vw, 2.2rem), 1.05, mayúsculas): nombre del ejercicio en curso.
- **Title** (700, 1.2rem a 1.4rem, mayúsculas): nombre de entreno en el marcador, filas de lista, título de hoja (1.15rem).
- **Body** (Barlow 400, 1rem, 1.5): texto corrido; los campos suben a 16 px en móvil para que iOS no haga zoom.
- **Figure** (Barlow 600, 1.45rem, números tabulares): kg y reps en las filas de serie.
- **Label / rótulo** (700, 0.75rem a 0.85rem, 0.12em a 0.16em, mayúsculas, `n6`): nombra la lectura o el campo que tiene justo al lado o debajo ("SERIES", "DESCANSO", "KG").
- **Button** (700, 0.95rem, 0.06em, mayúsculas): todos los botones; 1.15rem a 1.4rem en las acciones grandes de la serie actual.

### Named Rules
**The Drawn Numerals Rule.** Las cifras protagonistas (serie actual, marcador, descanso, récord, sello de marca) no son una fuente: son el display de 7 segmentos en SVG, inclinado -6°, con los segmentos apagados al 7 % de opacidad como construcción visible. El tono del segmento sigue The One Meaning Rule.

**The Nameplate Rule.** Un rótulo nombra una lectura, un campo o un panel. No se apila sobre un titular como etiqueta de categoría.

## Layout

Columna única mobile-first de 44rem como máximo, centrada, con 1rem de margen lateral y 1.25rem arriba. La barra de navegación inferior es fija (3.75rem más el área segura) y en pantallas de 768 px o más se ciñe al ancho de la columna con bordes laterales. El temporizador de descanso se acopla a todo el ancho justo encima de la navegación, siempre al alcance del pulgar.

El ritmo es compacto, en pasos de 0.25rem: 0.5rem entre filas, 0.6rem a 0.75rem entre controles, 1rem a 1.25rem de relleno de panel y entre secciones, 1.75rem bajo la cabecera de página.

La cifra de la serie actual se escala con container queries: el 88 % del ancho útil se reparte según los caracteres reales, con un tope de 6rem. La duración es longitud: el descanso se dibuja como una barra proporcional de 4 px al pie de su celda y la tira del marcador tiene una celda por serie.

### Named Rules
**The Thumb Floor Rule.** Todo control táctil mide al menos 44 px (`touch-min`). Los tamaños compactos de 36 px suben a 44 px con `pointer: coarse`. Las acciones principales del entreno miden 3.75rem.

## Elevation & Depth

El sistema es plano y de chapa: la profundidad se construye con tono (de `n0` a `n2`), bordes de junta de 1 px y un bisel superior, no con sombras. Lo hundido (displays, cajas de pilotos, campos de ajuste, interruptores) se dibuja con una sombra interior. Solo lo que flota sobre la página (hoja inferior, temporizador de descanso, toasts, desplegables, fila levantada al arrastrar) lleva una sombra difusa oscura, nunca de color.

### Shadow Vocabulary
- **Bisel** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04)`): borde superior de todo panel, fila y marcador.
- **Alojamiento hundido** (`box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5)`): caja de los pilotos, sello de marca, display del temporizador, carril del interruptor.
- **Capa flotante** (`box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55)`): toasts, tarjeta de récord, desplegables. La hoja inferior proyecta hacia arriba (`0 -12px 32px rgba(0, 0, 0, 0.5)`) y el descanso igual (`0 -8px 20px rgba(0, 0, 0, 0.45)`).
- **Fila levantada** (`box-shadow: 0 8px 18px rgba(0, 0, 0, 0.6)`): la serie mientras se arrastra.

### Named Rules
**The No Glow Rule.** Ninguna luz emite halo: ni `text-shadow`, ni sombras de color, ni degradados. Un LED encendido es un relleno plano.

## Shapes

Esquinas de hardware: 3 px en campos, chips y botones de icono; 4 px en botones, filas, lecturas y la hoja inferior (solo arriba); 6 px en paneles. Las barras de progreso y celdas usan 1 px y el asa de la hoja 2 px. Lo único redondo son los pilotos de jueces y la luz de estado de cada serie (círculos). Los bordes son siempre de 1 px; el estado activo de la navegación es una barra ámbar de 3 px en el borde superior, como el piloto de una consola.

## Components

### Buttons
Rótulo condensado en mayúsculas sobre esquina de hardware; se hunde 1 px al pulsar.
- **Shape:** casi recto (4 px), alto mínimo de 44 px; grande de 52 px.
- **Primary:** ámbar con texto ámbar quemado. Uno por vista: la acción viva (Hecha, Terminar, Enviar).
- **Hover / Focus:** ámbar encendido; foco de teclado con contorno ámbar de 2 px y 2 px de separación; `translateY(1px)` al pulsar; deshabilitado al 55 %.
- **Secondary:** chapa `n1` con borde `n4`; hover `n2` con borde `n5`.
- **Danger:** relleno rojo tenue, texto rojo, borde rojo al 40 %. **Quiet danger:** solo texto rojo, para que borrar no compita con la principal.
- **Icon button:** 44 × 44 px, sin fondo, icono Lucide `n7`; hover `n2`.

### Chips
- **Style:** contorno `n4`, texto condensado en mayúsculas `n7`, 3 px; los grupos musculares.
- **State:** el filtro activo se rellena de ámbar con texto ámbar quemado; el inactivo es contorno `n4` y pasa a ámbar en hover. El chip de respuesta rápida del chat sigue el mismo patrón.

### Cards / Containers
- **Corner Style:** 6 px en paneles, 4 px en filas.
- **Background:** `n1`; el panel de la serie actual y el hover pasan a `n2`.
- **Shadow Strategy:** solo el bisel (ver Elevation & Depth).
- **Border:** 1 px `n3`; la fila de la serie en curso lleva borde ámbar al 55 %.
- **Internal Padding:** 1rem a 1.25rem en paneles; 0.9rem × 1rem en filas de lista.

### Inputs / Fields
- **Style:** fondo carcasa `n0`, borde `n4`, 3 px, texto `n8`, 0.75rem × 1rem.
- **Focus:** borde ámbar más un anillo ámbar de 1 px; sin halo.
- **Error:** borde rojo LED; aviso en caja de rojo tenue con borde rojo.
- **Label:** rótulo condensado en mayúsculas `n6` encima del campo.

### Navigation
Barra inferior fija de tres destinos (Entrenos, Ejercicios, Perfil; el entrenador vive solo dentro de cada entreno, en la cabecera) sobre carcasa `n0` con junta superior `n3`. Cada destino apila un icono Lucide de 22 px y un rótulo condensado de 0.72rem en `n6`; el hover pasa a `n8` y el activo se enciende en ámbar con una barra ámbar de 3 px en el borde superior.

### Segment Display (signature)
Display de 7 segmentos dibujado en SVG, en caja de 60 × 100 con segmentos hexagonales; 1em es la altura del dígito. La coma y el punto se dibujan como punto decimal y los dos puntos como separador de reloj. Tonos: ámbar (en curso), blanco (hechas, récord), rojo (descanso en marcha), apagado `n6` (descanso en pausa). Siempre lleva `role="img"` con una etiqueta legible ("82,5 kilos"). Se monta dentro de una lectura hundida `n0` con su rótulo encima.

### Judge Lights (signature)
Tres pilotos circulares: apagados en `n2` con aro `n4`, encendidos en blanco de jueces. Al batir un récord se encienden en secuencia (escalonado de 0.22 s, encendido en seco con `steps`), sin animación con reduced-motion. Con rótulo se alojan en una caja hundida `n0`.

### State Vocabulary
Un vocabulario de estado fijo para cada serie: **pendiente** (aro `n5` vacío), **en curso** (luz y borde ámbar), **hecha** (luz blanca, cifras atenuadas a `n7`), **PR** (etiqueta con contorno blanco de jueces). La tira del marcador repite el código: `n3` pendiente, ámbar en curso, blanco hecha. Además es la navegación del entreno: la banda es fija arriba, tocar o arrastrar sobre la tira lleva a esa serie (scroll en lista, tarjeta en tarjetas), un cursor más alto marca la que se está viendo, los tramos de distinto ejercicio se separan con un hueco y una etiqueta con el nombre acompaña al dedo. El descanso ocupa la segunda lectura de la banda (toca para iniciar o pausar; −15/+15/cerrar cuelgan bajo la banda sin empujar el contenido) y el tiempo de sesión se consulta en Datos del entreno. Ambos relojes sobreviven a recargar la página.

### Bottom Sheet
Sustituye a todos los modales. Sube desde abajo (0.28s, `cubic-bezier(0.22, 1, 0.36, 1)`) sobre un fondo `rgba(5, 6, 7, 0.7)`; chapa `n1`, junta superior, esquinas de 4 px solo arriba, asa de 4 px en `n4`, título condensado y botón de cierre de 44 px. Se cierra con el fondo, Escape o el botón y devuelve el foco. Alto automático o casi completo para el chat.

### Rest Timer
Barra acoplada encima de la navegación: progreso rojo de 6 px que mide lo que queda, cuenta atrás en segmentos rojos, controles de ±15 s y pausa de 44 px. En pausa todo pasa a `n6`; al terminar la barra y el aviso pasan a ámbar, porque toca actuar.

### Long-press Reorder
Las series se reordenan manteniendo pulsado 450 ms sin moverse más de 10 px; moverse antes es scroll normal. La fila levantada pasa a `n3` con borde `n6` y sombra de fila levantada, el destino se marca en ámbar tenue con borde ámbar y la página se desplaza sola cerca de los bordes. Con ratón es arrastre HTML5. No hay botón de mover.

## Do's and Don'ts

### Do:
- **Do** reservar el ámbar para lo vivo o accionable: una acción principal por vista, la serie en curso, la pestaña activa y el foco.
- **Do** dibujar las cifras protagonistas con el display de 7 segmentos y sus segmentos apagados al 7 %, con etiqueta accesible.
- **Do** usar solo `n0`..`n8` para neutros y biseles de 1 px para separar paneles.
- **Do** dar a todo control táctil al menos 44 px y poner las acciones del entreno al alcance del pulgar.
- **Do** abrir formularios, datos y el chat en una hoja inferior.
- **Do** marcar el estado de una serie solo con pendiente, en curso, hecha o PR y su código de luces.
- **Do** usar iconos Lucide de un solo grosor (2 a 3 px de trazo) y respetar reduced-motion en toda animación.

### Don't:
- **Don't** usar halos, `text-shadow`, sombras de color ni degradados; un LED encendido es un relleno plano.
- **Don't** redondear más de 6 px un contenedor ni usar formas de píldora; solo los pilotos son círculos.
- **Don't** usar el ámbar para datos, decoración o estado "hecha"; ni el blanco de jueces como color de texto general.
- **Don't** abrir modales centrados.
- **Don't** usar emojis como iconos ni imágenes de ejercicios.
- **Don't** añadir un botón de mover para reordenar; se reordena con pulsación larga.
- **Don't** introducir un tema claro sin decisión del propietario: hoy el tema es oscuro fijo por la escena del gimnasio.

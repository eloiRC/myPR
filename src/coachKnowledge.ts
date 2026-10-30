// Base de conocimiento del entrenador: resumen de knowledge/*.md (fichas con fuentes). Va en el bloque estable
// del prompt (cacheado): no meter nada variable. Si cambias una ficha, actualiza aquí su resumen.
export const COACH_KNOWLEDGE = `BASE DE CONOCIMIENTO (reglas para programar; sin etiqueta = evidencia moderada-alta)
Datos sobre todo de hombres jóvenes en estudios cortos: ajusta con el feedback del usuario. "Serie" = serie dura (0-3 RIR). Series indirectas cuentan 0,5.

VOLUMEN Y FRECUENCIA
- Hipertrofia, series por músculo y semana: mínimo útil ~4; tramo más eficiente 5-10; referencia estándar 10-20.
- Punto de partida: 6-10 series/semana en principiantes, 10-12 en entrenados. Sube hacia 12-20 solo si se estanca y recupera bien. [evidencia baja]
- Por encima de ~20 series cada mejora cuesta mucho más volumen: reserva >20-25 para bloques puntuales.
- Recuento fraccional: press banca = 1 pecho + 0,5 tríceps + 0,5 deltoide anterior; remos y jalones = 0,5 bíceps.
- Fuerza: las mejoras se acumulan hasta ~4 series semanales por grupo muscular; a partir de ~5 las extra no suman de forma consistente.
- Por sesión, hipertrofia: no pases de ~10-11 series (fraccionales) por músculo; si hace falta más volumen, añade otra sesión. [evidencia baja]
- Por sesión, fuerza: ~2 series directas del levantamiento recogen casi todo el efecto; mejor más sesiones (hasta ~2-3/semana) que más series. [evidencia baja]
- Mínimo 2 series por ejercicio; para fuerza, 2-3 series por ejercicio con ≥80 % 1RM.
- Frecuencia por defecto: cada músculo ≥2 veces/semana.
- Hipertrofia: a igual volumen semanal, 1, 2 o 3 sesiones rinden parecido; la frecuencia sirve para repartirlo (p. ej. 20 series en 2-3 sesiones).
- Fuerza: practica el levantamiento objetivo ≥2 veces/semana; el paso de 1 a 2 sesiones es el que más rinde.

INTENSIDAD Y FALLO
- Hipertrofia: cualquier rango de ~6 a 30 reps (carga ≥~30 % 1RM) sirve si la serie acaba a 0-3 RIR. 6-15 es el rango más cómodo y eficiente en tiempo.
- Fuerza máxima: incluye trabajo pesado (>80 % 1RM, ~1-6 reps, hasta 8) en el levantamiento a mejorar. Para fuerza basta 1-4 RIR; importa más la carga que la cercanía al fallo.
- Cargas ligeras (>15 reps): ir muy cerca del fallo (0-1 RIR); útiles con molestias articulares o poco material.
- Guíate por reps y RIR más que por %1RM: las reps con un mismo % varían por persona y ejercicio.
- 1-2 RIR rinde prácticamente igual que el fallo con menos fatiga.
- Básicos pesados (sentadilla, peso muerto, press): 2-3 RIR en las primeras series, 1-2 en la última; fallo casi nunca. [opinión]
- Aislamiento y máquinas: 0-2 RIR, fallo permitido en la última serie. [opinión]
- Principiantes: 2-4 RIR, prioridad a la técnica.
- Si empeoran fatiga, agujetas o motivación, aléjate del fallo antes que recortar series.
- RPE 10 = 0 RIR, 9 = 1, 8 = 2. Pide el RIR de cada serie y ajusta la siguiente serie o sesión.
- Si el RIR real se aleja 2 o más del objetivo, cambia la carga (~2-5 %). [opinión]
- Principiantes: alguna serie de calibración al fallo en máquina o aislamiento para aprender a estimar.

DESCANSOS
- Hipertrofia: básicos multiarticulares y tren inferior 1,5-3 min; aislamiento o máquinas con carga moderada 1-2 min.
- Regla por defecto: descansa hasta poder repetir una serie de calidad parecida, mínimo orientativo 1,5-2 min en básicos pesados.
- Fuerza (≤5 reps, >80 % 1RM) en entrenados: 2-5 min; básicos multiarticulares pesados 3-5 min; monoarticulares con carga muy alta ~2 min. Cuanto más pesada la carga, más importa alargar el descanso.
- Principiantes: 1-2 min.
- Sin tiempo, acortar descansos es aceptable si se mantienen las series y el esfuerzo (o se añade alguna serie). [evidencia baja]

TÉCNICAS
- Superseries: para ahorrar tiempo, no para crecer más. Prefiere agonista-antagonista (press + remo) o zonas distintas (torso + pierna). Evita superseries del mismo músculo o patrón si importan volumen o fuerza. Avisa: se sienten más duras.
- Drop sets, rest-pause, myo-reps: igual de eficaces que series normales, más rápidas y bastante más duras. Úsalos sobre todo en la última serie de aislamiento o máquina; máximo 1-2 ejercicios por sesión y no en todas las sesiones; nunca en básicos técnicos pesados (sentadilla, peso muerto).
- Clusters (pausas dentro de la serie): para mantener velocidad y técnica con cargas altas o potencia, no para ganar más músculo ni fuerza. Para resistencia muscular local, series tradicionales.
- Preagotamiento: no para maximizar hipertrofia; solo como variación o para limitar la carga del multiarticular. [evidencia baja]
- Top set + back-off: formato válido en la práctica. [opinión]
- Recorrido completo por defecto, con tensión real en la parte estirada. Si no se puede (dolor, técnica), prioriza la mitad estirada: parcial largo ≈ completo > parcial corto. No uses parciales en la parte acortada como estrategia principal.
- Biarticulares: elige la variante que estira la otra articulación (curl femoral sentado, tríceps por encima de la cabeza, extensión de rodilla reclinado, gemelo de pie).

SELECCIÓN DE EJERCICIOS (por músculo)
- Máquinas y peso libre equivalen para hipertrofia: elige por preferencia, seguridad y material; las máquinas facilitan acercarse al fallo con seguridad.
- Para ganar fuerza en un levantamiento con barra, entrena ese levantamiento con peso libre (la fuerza es específica).
- No elijas ejercicios por estudios de activación (EMG) ni afirmes nada sobre unilateral frente a bilateral.
- Pecho: base un press (plano, inclinado, mancuernas, máquina o fondos) por comodidad; algo de inclinado si se busca la parte superior; completa con un ejercicio que estire bien (aperturas en polea o máquina, press con mancuernas). [evidencia baja]
- Espalda: cada semana al menos un tirón vertical (jalón o dominadas) y uno horizontal (remo). Jalón con estiramiento arriba; remo dejando separar las escápulas. [opinión]
- Deltoide lateral: elevaciones laterales con mancuerna o polea (resultados similares), cerca del fallo. Anterior: normalmente bastan los presses. Posterior: pájaros, face pull, remo con codos abiertos o pec-deck inverso [opinión].
- Tríceps: incluye una extensión por encima de la cabeza (crece más que con pushdown).
- Bíceps: prioriza curls que carguen el codo casi extendido; parciales en la mitad estirada válidos.
- Cuádriceps: combina un multiarticular (sentadilla o prensa) con extensión de rodilla, necesaria para el recto femoral; hazla con respaldo reclinado. Parciales en extensión: con la rodilla flexionada. Sentadilla profunda mejor que media si interesan glúteo y aductores.
- Isquios: necesitan trabajo específico: curl femoral (mejor sentado que tumbado) y/o bisagra de cadera (p. ej. peso muerto rumano). No cuentes sentadilla, prensa ni hip thrust como trabajo de isquios.
- Glúteo: sentadilla profunda, prensa o hip thrust; los tres sirven. Buena opción: ejercicios que llevan la cadera a flexión profunda con carga.
- Gemelo: elevaciones de talón de pie (rodilla extendida) con énfasis o pausa abajo; sentado es opcional (de pie ya trabaja el sóleo). Parciales en la parte estirada (talón abajo), buena opción.
- Abdominales: crunch con carga o en polea, o elevaciones de piernas flexionando la columna; progresa la carga. [opinión]

PROGRESIÓN Y DESCARGAS
- Doble progresión: fija un rango (p. ej. 8-12); al completar el tope en todas las series, sube la carga el mínimo disponible (~2-5 %) y vuelve al inicio del rango.
- Hipertrofia: subir reps o series con esfuerzo alto vale tanto como subir carga.
- Elegir la carga del día por RIR/RPE rinde igual que %1RM fijos y tolera mejor los días malos.
- Ejercicios pequeños: si el salto mínimo de disco es grande, progresa en reps (o microdiscos [opinión]).
- Descarga en entrenados con volumen alto cada ~4-8 semanas, o antes si la fatiga física o mental lo pide o el rendimiento cae varias sesiones seguidas. [evidencia baja]
- Descarga: 30-50 % menos series, menos reps y más RIR, manteniendo carga, ejercicios y frecuencia (o quitando un día). No pares del todo si el objetivo es fuerza. En principiantes probablemente no hace falta. [evidencia baja]
- Estancamiento, en este orden [opinión]: 1) revisa sueño, comida y proteína, constancia, técnica y esfuerzo (0-3 RIR); 2) mucha fatiga → descarga sin dejar de entrenar; 3) fatiga baja → sube volumen (+1-2 series semanales por músculo) o frecuencia; 4) cambia el modo de progresión (carga ↔ reps), mete días pesados y ligeros o autorregula por RIR, cambia un accesorio manteniendo el levantamiento principal.
- Periodización útil, no imprescindible: para hipertrofia mandan volumen y esfuerzo; para fuerza en entrenados, ondulante (días pesados, medios y ligeros) es razonable.

VARIEDAD
- Por músculo, 2-3 ejercicios complementarios (distinto ángulo, longitud muscular o articulación), mantenidos un bloque mientras progresen (orientativo 4-8 semanas). [evidencia baja]
- Rota accesorios entre bloques; mantén fijos los levantamientos en los que se quiere medir y ganar fuerza.
- No cambies ejercicios al azar en cada sesión.
- Si el usuario se aburre, algo de variación mejora la motivación sin coste en músculo.

DIVISIONES Y FORMATOS
- La división es cuestión de agenda y adherencia: mantén el volumen semanal y ≥2 sesiones por músculo; rotarla entre bloques da variedad.
- 2-3 días: cuerpo completo. 4 días: torso/pierna. 5-6 días: empuje/tirón/pierna o híbridos. [evidencia baja]
- Pon primero el ejercicio cuya fuerza se quiere priorizar; el resto del orden puede variar.
- Tipos de sesión [opinión]: Fuerza: 1-2 básicos al inicio, 3-6 reps, 2-4 series, 2-4 min de descanso, accesorios después. Hipertrofia: 4-6 ejercicios, 6-15 reps (hasta 30) cerca del fallo, 1-2 min. Circuito: 5-8 ejercicios ligeros-moderados con descansos cortos, no antes de una sesión pesada ni si se busca potencia. Densidad: máximo de series de calidad en 10-15 min o EMOM, progresando en trabajo por tiempo. Puedes rotar (A fuerza, B hipertrofia, C exprés) manteniendo ~10+ series por músculo y semana.
- Sesión exprés 30-40 min: 1-2 series de aproximación, 3-5 multiarticulares en superseries agonista-antagonista, 2-3 series cerca del fallo y, si sobra tiempo, un drop set final en un accesorio. Importa el volumen semanal, no la duración: antes que recortar series, usa superseries o técnicas que ahorran tiempo.
- Fuerza con poco tiempo: 1-3 series pesadas por levantamiento, 2-3 días/semana, ya hacen progresar.
- En casa con poco material: series de 15-30 o más reps a 0-3 RIR (mejor 0-1 en series largas). Las gomas sirven igual que pesas o máquinas para fuerza general. Avisa: para maximizar el 1RM de un levantamiento, el material ligero se queda corto.
- Progresión sin cargas pesadas [opinión]: más reps → más series → tempo lento o pausas → variante a una pierna o un brazo (búlgara, peso muerto a una pierna) → menos descanso → goma más dura o goma + mancuerna.
- Cardio: no compromete fuerza máxima ni hipertrofia. Para potencia o salto, sepáralo ≥3 h o en días distintos. Misma sesión: fuerza primero si es la prioridad. Si prima la masa, cardio de bajo impacto (bici, remo, caminar) moderado y nada intenso justo antes de pierna. [evidencia baja]

POBLACIONES
- Mujeres: mismas reglas de volumen, frecuencia, carga y esfuerzo que los hombres; no hay base para "rutinas de mujer" con cargas ligeras.
- Mayores: la fuerza es segura y muy recomendable. 2-3 series de 1-2 multiarticulares por grupo muscular, 2-3 días/semana, al 70-85 % 1RM (50-85 % y 6-12 reps para fuerza y masa), con buena técnica.
- Mayores: empieza con poco volumen (p. ej. 4-8 series por músculo y semana [evidencia baja]) y sube según tolerancia; sin fallo (2-3 RIR).
- Mayores: potencia con 40-60 % 1RM a máxima velocidad concéntrica. Máquinas, gomas o ejercicios sentados son válidos si preocupa la seguridad.

DOLOR Y MOLESTIAS
- Nunca diagnostiques ni trates: adapta el entrenamiento y, si hace falta, deriva a un profesional sanitario.
- Semáforo de dolor: 0-2/10 seguro; 2-5/10 aceptable; >5/10 riesgo. Durante y justo después hasta 5/10; a la mañana siguiente no más de 5/10 (mejor, de vuelta al nivel habitual); dolor y rigidez no deben ir subiendo semana a semana.
- Si no se cumple: baja carga, rango o volumen, o cambia de ejercicio. Mejor adaptar y seguir moviéndose que parar del todo. No hace falta buscar el dolor.
- Señales de alarma → parar y derivar: golpe con chasquido, deformidad o incapacidad de apoyar; bloqueo; hinchazón importante; fiebre o malestar general; dolor nocturno o en reposo que no cede; pérdida de fuerza, hormigueo o adormecimiento que avanza; dolor que empeora semanas pese a reducir la carga.
- Hombro: ejercicio activo y progresivo, no reposo total. Adapta el press [opinión]: menos rango abajo (press en suelo o con pausa), agarre algo más cerrado y codos a ~45°, mancuernas o agarre neutro, inclinación ligera; cambia fondos profundos y press tras nuca; baja la carga. Añade rotación externa y elevaciones, ~3 series, ligero y progresando unas 12 semanas. Deriva si no mejora en unas semanas.
- Rodilla (dolor delantero): mantén sentadilla y zancada ajustando profundidad (p. ej. a cajón), ritmo y carga. Combina cadera (glúteo medio) y cuádriceps en rango cómodo. Si el dolor llegó tras subir el entreno de golpe, reduce y vuelve a subir poco a poco. Tendón rotuliano: isométricos (prensa o extensión, 30-45 s) → fuerza pesada y lenta → saltos, según dolor.
- Lumbar inespecífico: seguir activo con adaptaciones; ningún tipo de ejercicio destaca, elige el sostenible. Adapta [opinión]: menos carga y rango (peso muerto desde bloques o con barra hexagonal, sentadilla a cajón o goblet), más RIR, variantes con menos carga en columna (prensa, hip thrust, búlgara). Con mucho dolor, empieza por ejercicio general o de control motor con poca carga antes del peso muerto pesado.
- Codo [evidencia baja]: no hace falta dejar el tren superior. Cara externa: menos agarre fuerte con muñeca extendida, correas en tirones y peso muerto, agarres neutros o gruesos, curl martillo o barra Z, menos carga en remos; añade trabajo progresivo de extensores de muñeca dentro del semáforo. Cara interna: igual con flexores de muñeca; reduce curls pesados con palma arriba y press francés si duelen [opinión]. La recuperación suele llevar meses; deriva si empeora o no mejora.`;

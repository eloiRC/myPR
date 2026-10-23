// Decisiones puras del reordenado táctil por pulsación larga (sin DOM, para poder probarlas).

export const PULSACION_LARGA_MS = 450;
export const TOLERANCIA_PX = 10;
/** Tras soltar un arrastre, el «click» que genera el navegador no debe marcar la serie como hecha */
export const VENTANA_CLICK_MS = 400;
export const ZONA_AUTOSCROLL_PX = 90;
export const PASO_AUTOSCROLL_MAX = 18;

export type FaseToque = 'esperando' | 'arrastrando' | 'scroll';

export const superaTolerancia = (dx: number, dy: number): boolean => Math.hypot(dx, dy) > TOLERANCIA_PX;

/**
 * Fase del gesto. Esperando: si el dedo se mueve más de 10 px es un scroll normal; si aguanta
 * 450 ms quieto, se levanta la fila. Arrastrando y scroll son estados finales hasta soltar.
 */
export function siguienteFase(fase: FaseToque, medida: { dx: number; dy: number; transcurridoMs: number }): FaseToque {
  if (fase !== 'esperando') return fase;
  if (superaTolerancia(medida.dx, medida.dy)) return 'scroll';
  if (medida.transcurridoMs >= PULSACION_LARGA_MS) return 'arrastrando';
  return 'esperando';
}

/**
 * Píxeles a desplazar la página por frame cuando el dedo está cerca de un borde.
 * Negativo = hacia arriba. `margenSup`/`margenInf` reservan las barras fijas (cabecera, navegación).
 */
export function autoScrollDelta(y: number, alto: number, margenSup = 0, margenInf = 0): number {
  const limiteSup = margenSup + ZONA_AUTOSCROLL_PX;
  const limiteInf = alto - margenInf - ZONA_AUTOSCROLL_PX;
  if (y < limiteSup) return -Math.round(PASO_AUTOSCROLL_MAX * Math.min(1, (limiteSup - y) / ZONA_AUTOSCROLL_PX));
  if (y > limiteInf) return Math.round(PASO_AUTOSCROLL_MAX * Math.min(1, (y - limiteInf) / ZONA_AUTOSCROLL_PX));
  return 0;
}

export const debeIgnorarClick = (finArrastreMs: number | null, ahoraMs: number): boolean =>
  finArrastreMs !== null && ahoraMs - finArrastreMs < VENTANA_CLICK_MS;

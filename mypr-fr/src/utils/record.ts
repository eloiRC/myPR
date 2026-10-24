// Récord de un ejercicio: la columna Exercici.PR se mantiene de forma incremental en el servidor
// y puede quedar desfasada respecto al historial (que se calcula en vivo sobre las series).
// Lo que se muestra nunca debe ser inferior al máximo del historial.

export interface PuntoPeso { PesoMaximo: number }

export interface RecordEjercicio {
  /** kg del récord a mostrar: max(PR guardado, máximo del historial); 0 = no hay */
  valor: number;
  /** El PR guardado es menor que el historial (dato desfasado) */
  desfasado: boolean;
}

export function recordEjercicio(pr: number | null | undefined, historial: PuntoPeso[] | null | undefined): RecordEjercicio {
  const guardado = Number(pr) > 0 ? Number(pr) : 0;
  const maxHist = (historial ?? []).reduce((m, h) => (Number(h.PesoMaximo) > m ? Number(h.PesoMaximo) : m), 0);
  return { valor: Math.max(guardado, maxHist), desfasado: maxHist > guardado };
}
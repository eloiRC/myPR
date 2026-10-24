// Posición recordada de un entreno: modo de vista y tarjeta actual (por SerieId, no por índice,
// para que sobreviva a reordenar o añadir series).

export type ModoVista = 'lista' | 'tarjetas';
export interface VistaEntreno {
  modo: ModoVista;
  serieId: number | null;
}

export const claveVista = (entrenoId: number) => `mypr_entreno_vista:${entrenoId}`;

const almacen = (): Storage | null => {
  try { return globalThis.localStorage ?? null; } catch { return null; }
};

export function leerVista(entrenoId: number, storage: Storage | null = almacen()): VistaEntreno | null {
  try {
    const raw = storage?.getItem(claveVista(entrenoId));
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || (v.modo !== 'lista' && v.modo !== 'tarjetas')) return null;
    const serieId = typeof v.serieId === 'number' && isFinite(v.serieId) ? v.serieId : null;
    return { modo: v.modo, serieId };
  } catch {
    return null;
  }
}

export function guardarVista(entrenoId: number, vista: VistaEntreno, storage: Storage | null = almacen()): void {
  try {
    storage?.setItem(claveVista(entrenoId), JSON.stringify(vista));
  } catch { /* sin almacenamiento disponible: no pasa nada */ }
}

/** Índice de la serie guardada dentro del orden actual; si ya no existe, el valor de respaldo. */
export function resolverIndiceTarjeta(serieId: number | null | undefined, orden: { SerieId: number }[], respaldo: () => number): number {
  if (serieId != null) {
    const idx = orden.findIndex(s => s.SerieId === serieId);
    if (idx !== -1) return idx;
  }
  return respaldo();
}

// Momento en que se abrió el entreno por primera vez: el reloj de sesión sobrevive a recargar la página.
export const claveAbierto = (entrenoId: number) => `mypr_entreno_abierto:${entrenoId}`;

/**
 * Segundo (epoch) desde el que cuenta la sesión de un entreno sin series con hora. Se reutiliza el guardado
 * mientras tenga menos de `maxSeg`; si no existe o es antiguo (otro día), empieza uno nuevo.
 */
export function abiertoPersistido(entrenoId: number, ahoraSeg: number, maxSeg: number, storage: Storage | null = almacen()): number {
  try {
    const v = Number(storage?.getItem(claveAbierto(entrenoId)));
    if (Number.isFinite(v) && v > 0 && v <= ahoraSeg && ahoraSeg - v <= maxSeg) return v;
  } catch { /* se ignora */ }
  try { storage?.setItem(claveAbierto(entrenoId), String(ahoraSeg)); } catch { /* sin almacenamiento */ }
  return ahoraSeg;
}

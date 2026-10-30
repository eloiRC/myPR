// Ejercicios archivados: ya no están disponibles (p. ej. cambio de gimnasio), pero su historial se conserva.
// Se ocultan de la lista y de los selectores de series nuevas; las series antiguas siguen mostrando su nombre.

export interface ConArchivat {
  ExerciciId: number;
  /** 1 = archivado (columna Exercici.Archivat); ausente en datos antiguos = activo */
  Archivat?: number | boolean | null;
}

export const esArchivado = (e: ConArchivat | null | undefined): boolean => !!e && Number(e.Archivat) === 1;

/**
 * Ejercicios que se pueden elegir en un selector de serie: solo los activos.
 * `actualId` (al editar una serie) se mantiene aunque esté archivado, para que su nombre se siga viendo.
 */
export function ejerciciosSeleccionables<T extends ConArchivat>(lista: T[], actualId?: number | null): T[] {
  return lista.filter(e => !esArchivado(e) || (actualId != null && e.ExerciciId === actualId));
}

/** Separa activos y archivados conservando el orden. */
export function separarArchivados<T extends ConArchivat>(lista: T[]): { activos: T[]; archivados: T[] } {
  const activos: T[] = [];
  const archivados: T[] = [];
  for (const e of lista) (esArchivado(e) ? archivados : activos).push(e);
  return { activos, archivados };
}

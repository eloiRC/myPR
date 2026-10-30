import { describe, it, expect } from 'vitest';
import { esArchivado, ejerciciosSeleccionables, separarArchivados } from '../utils/archivado';

const lista = [
  { ExerciciId: 1, Nom: 'Press Banca', Archivat: 0 },
  { ExerciciId: 2, Nom: 'Press Hammer', Archivat: 1 },
  { ExerciciId: 3, Nom: 'Aperturas' }, // datos antiguos sin columna
];

describe('ejercicios archivados', () => {
  it('esArchivado solo con Archivat = 1', () => {
    expect(lista.map(esArchivado)).toEqual([false, true, false]);
    expect(esArchivado(null)).toBe(false);
  });

  it('el selector de series nuevas no ofrece archivados', () => {
    expect(ejerciciosSeleccionables(lista).map(e => e.ExerciciId)).toEqual([1, 3]);
  });

  it('al editar, el ejercicio actual se mantiene aunque esté archivado', () => {
    expect(ejerciciosSeleccionables(lista, 2).map(e => e.ExerciciId)).toEqual([1, 2, 3]);
    expect(ejerciciosSeleccionables(lista, 1).map(e => e.ExerciciId)).toEqual([1, 3]);
  });

  it('separarArchivados', () => {
    const { activos, archivados } = separarArchivados(lista);
    expect(activos.map(e => e.ExerciciId)).toEqual([1, 3]);
    expect(archivados.map(e => e.ExerciciId)).toEqual([2]);
  });
});

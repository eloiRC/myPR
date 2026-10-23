import { describe, it, expect } from 'vitest';
import { claveVista, leerVista, guardarVista, resolverIndiceTarjeta } from '../utils/vistaEntreno';

const fakeStorage = (init: Record<string, string> = {}, throws = false) => {
  const data = { ...init };
  return {
    getItem: (k: string) => { if (throws) throw new Error('no'); return k in data ? data[k] : null; },
    setItem: (k: string, v: string) => { if (throws) throw new Error('no'); data[k] = v; },
  } as unknown as Storage;
};

describe('posición recordada del entreno', () => {
  it('guarda y lee por entreno', () => {
    const st = fakeStorage();
    guardarVista(3, { modo: 'tarjetas', serieId: 42 }, st);
    expect(st.getItem(claveVista(3))).toBe('{"modo":"tarjetas","serieId":42}');
    expect(leerVista(3, st)).toEqual({ modo: 'tarjetas', serieId: 42 });
    expect(leerVista(4, st)).toBeNull();
  });
  it('ignora datos corruptos o inválidos', () => {
    expect(leerVista(1, fakeStorage({ [claveVista(1)]: '{no json' }))).toBeNull();
    expect(leerVista(1, fakeStorage({ [claveVista(1)]: '{"modo":"x"}' }))).toBeNull();
    expect(leerVista(1, fakeStorage({ [claveVista(1)]: '{"modo":"lista","serieId":"a"}' }))).toEqual({ modo: 'lista', serieId: null });
  });
  it('no revienta si el almacenamiento falla o no existe', () => {
    const roto = fakeStorage({}, true);
    expect(leerVista(1, roto)).toBeNull();
    expect(() => guardarVista(1, { modo: 'lista', serieId: null }, roto)).not.toThrow();
    expect(leerVista(1, null)).toBeNull();
    expect(() => guardarVista(1, { modo: 'lista', serieId: null }, null)).not.toThrow();
  });
  it('resuelve el índice por SerieId y cae al respaldo si ya no existe', () => {
    const orden = [{ SerieId: 10 }, { SerieId: 7 }, { SerieId: 99 }];
    expect(resolverIndiceTarjeta(7, orden, () => 0)).toBe(1);
    expect(resolverIndiceTarjeta(5, orden, () => 2)).toBe(2);
    expect(resolverIndiceTarjeta(null, orden, () => 2)).toBe(2);
  });
});

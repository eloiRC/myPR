import { describe, it, expect } from 'vitest';
import { claveVista, leerVista, guardarVista, resolverIndiceTarjeta , abiertoPersistido } from '../utils/vistaEntreno';

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

describe('abiertoPersistido', () => {
  const memoria = (): Storage => {
    const d = new Map<string, string>();
    return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => { d.set(k, v); } } as unknown as Storage;
  };
  it('la primera vez guarda el momento actual y las siguientes lo reutiliza', () => {
    const s = memoria();
    expect(abiertoPersistido(5, 1000, 21600, s)).toBe(1000);
    expect(abiertoPersistido(5, 1500, 21600, s)).toBe(1000);
  });
  it('empieza de nuevo si lo guardado es muy antiguo', () => {
    const s = memoria();
    abiertoPersistido(5, 1000, 21600, s);
    expect(abiertoPersistido(5, 1000 + 21601, 21600, s)).toBe(22601);
  });
  it('sin almacenamiento devuelve ahora', () => expect(abiertoPersistido(5, 1000, 21600, null)).toBe(1000));
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  iniciarEstado, restanteMs, pausarEstado, reanudarEstado, ajustarEstado,
  progresoEstado, formatearMmSs, clampDuracionSeg, leerAjustes, resolverDescanso, desdeServidor, haciaServidor,
  debeMigrarLocales, sincronizarAjustes, type DepsSync,
} from '../composables/useRestTimer';

describe('temporizador de descanso (lógica pura)', () => {
  const T0 = 1_000_000;

  it('calcula el restante desde el timestamp objetivo', () => {
    const e = iniciarEstado(90, T0);
    expect(e.finMs).toBe(T0 + 90_000);
    expect(restanteMs(e, T0)).toBe(90_000);
    // Aunque pasen 60 s de golpe (pestaña en segundo plano) el cálculo es correcto
    expect(restanteMs(e, T0 + 60_000)).toBe(30_000);
  });

  it('nunca baja de 0', () => {
    const e = iniciarEstado(60, T0);
    expect(restanteMs(e, T0 + 60_000)).toBe(0);
    expect(restanteMs(e, T0 + 999_999)).toBe(0);
  });

  it('pausa congela el tiempo y reanudar lo continúa', () => {
    const e = iniciarEstado(60, T0);
    const p = pausarEstado(e, T0 + 20_000);
    expect(p.pausadoMs).toBe(40_000);
    expect(restanteMs(p, T0 + 500_000)).toBe(40_000);
    const r = reanudarEstado(p, T0 + 100_000);
    expect(r.pausadoMs).toBeNull();
    expect(restanteMs(r, T0 + 110_000)).toBe(30_000);
  });

  it('pausar/reanudar es idempotente', () => {
    const e = iniciarEstado(60, T0);
    expect(reanudarEstado(e, T0)).toBe(e);
    const p = pausarEstado(e, T0);
    expect(pausarEstado(p, T0 + 5000)).toBe(p);
  });

  it('±15 s ajusta el restante y recorta en 0', () => {
    const e = iniciarEstado(60, T0);
    const mas = ajustarEstado(e, 15_000, T0 + 10_000);
    expect(restanteMs(mas, T0 + 10_000)).toBe(65_000);
    expect(mas.totalMs).toBe(65_000);
    const menos = ajustarEstado(e, -15_000, T0 + 50_000);
    expect(restanteMs(menos, T0 + 50_000)).toBe(0);
    const mucho = ajustarEstado(e, -15_000, T0 + 55_000);
    expect(restanteMs(mucho, T0 + 55_000)).toBe(0);
  });

  it('ajustar en pausa mantiene la pausa', () => {
    const p = pausarEstado(iniciarEstado(60, T0), T0 + 30_000);
    const a = ajustarEstado(p, -15_000, T0 + 99_000);
    expect(a.pausadoMs).toBe(15_000);
    expect(restanteMs(a, T0 + 200_000)).toBe(15_000);
    expect(ajustarEstado(p, -60_000, T0).pausadoMs).toBe(0);
  });

  it('progreso entre 0 y 1', () => {
    const e = iniciarEstado(100, T0);
    expect(progresoEstado(e, T0)).toBe(0);
    expect(progresoEstado(e, T0 + 25_000)).toBeCloseTo(0.25);
    expect(progresoEstado(e, T0 + 200_000)).toBe(1);
  });

  it('formatea mm:ss redondeando hacia arriba', () => {
    expect(formatearMmSs(90_000)).toBe('01:30');
    expect(formatearMmSs(89_001)).toBe('01:30');
    expect(formatearMmSs(0)).toBe('00:00');
    expect(formatearMmSs(-5)).toBe('00:00');
    expect(formatearMmSs(600_000)).toBe('10:00');
  });

  it('recorta la duración a un rango válido', () => {
    expect(clampDuracionSeg(1)).toBe(15);
    expect(clampDuracionSeg(99999)).toBe(900);
    expect(clampDuracionSeg(NaN)).toBe(90);
    expect(clampDuracionSeg(75.4)).toBe(75);
  });
});

describe('ajustes persistidos', () => {
  beforeEach(() => localStorage.clear());

  it('valores por defecto: apagado, 90 s, auto-inicio activo', () => {
    expect(leerAjustes()).toEqual({ habilitado: false, duracionSeg: 90, autoIniciar: true });
  });

  it('tolera JSON corrupto', () => {
    localStorage.setItem('mypr_rest_timer_settings', '{no-json');
    expect(leerAjustes().habilitado).toBe(false);
  });

  it('lee valores guardados y sanea la duración', () => {
    localStorage.setItem('mypr_rest_timer_settings', JSON.stringify({ habilitado: true, duracionSeg: 5000, autoIniciar: false }));
    expect(leerAjustes()).toEqual({ habilitado: true, duracionSeg: 900, autoIniciar: false });
  });
});

describe('resolverDescanso (jerarquía serie > ejercicio > global)', () => {
  const aj = { duracionSeg: 90 };

  it('usa el de la serie si lo tiene', () => {
    expect(resolverDescanso({ DescansoSeg: 150 }, { DescansoSeg: 120 }, aj)).toBe(150);
  });
  it('si la serie no tiene, usa el del ejercicio', () => {
    expect(resolverDescanso({ DescansoSeg: null }, { DescansoSeg: 120 }, aj)).toBe(120);
    expect(resolverDescanso({}, { DescansoSeg: 120 }, aj)).toBe(120);
  });
  it('si ninguno tiene, usa el global', () => {
    expect(resolverDescanso({ DescansoSeg: null }, { DescansoSeg: null }, aj)).toBe(90);
    expect(resolverDescanso(undefined, undefined, aj)).toBe(90);
    expect(resolverDescanso(null, null, { duracionSeg: 60 })).toBe(60);
  });
  it('0 = sin descanso: no arranca el temporizador (null), ni hereda', () => {
    expect(resolverDescanso({ DescansoSeg: 0 }, { DescansoSeg: 120 }, aj)).toBeNull();
    expect(resolverDescanso({ DescansoSeg: null }, { DescansoSeg: 0 }, aj)).toBeNull();
    // el de la serie manda sobre un ejercicio "sin descanso"
    expect(resolverDescanso({ DescansoSeg: 60 }, { DescansoSeg: 0 }, aj)).toBe(60);
  });
  it('ignora valores fuera de rango o no numéricos y cae al siguiente nivel', () => {
    expect(resolverDescanso({ DescansoSeg: 5 }, { DescansoSeg: 2000 }, aj)).toBe(90);
    expect(resolverDescanso({ DescansoSeg: NaN }, null, aj)).toBe(90);
    expect(resolverDescanso({ DescansoSeg: '120' as any }, null, aj)).toBe(90);
  });
  it('los límites 15 y 900 son válidos', () => {
    expect(resolverDescanso({ DescansoSeg: 15 }, null, aj)).toBe(15);
    expect(resolverDescanso({ DescansoSeg: 900 }, null, aj)).toBe(900);
  });
});

describe('ajustes del servidor', () => {
  it('desdeServidor convierte 0/1 y sanea', () => {
    expect(desdeServidor({ RestTimerEnabled: 1, RestTimerDefaultSec: 120, RestTimerAutoStart: 0 }))
      .toEqual({ habilitado: true, duracionSeg: 120, autoIniciar: false });
    expect(desdeServidor({})).toEqual({ habilitado: false, duracionSeg: 90, autoIniciar: true });
    expect(desdeServidor({ RestTimerDefaultSec: 5000 }).duracionSeg).toBe(900);
  });
  it('haciaServidor usa los nombres de la API', () => {
    expect(haciaServidor({ habilitado: true, duracionSeg: 75, autoIniciar: false })).toEqual({ enabled: true, defaultSec: 75, autoStart: false });
  });
  it('debeMigrarLocales: solo con servidor por defecto, local propio y sin migrar antes', () => {
    const def = { habilitado: false, duracionSeg: 90, autoIniciar: true };
    const propio = { habilitado: true, duracionSeg: 120, autoIniciar: true };
    expect(debeMigrarLocales(def, propio, false)).toBe(true);
    expect(debeMigrarLocales(def, propio, true)).toBe(false);
    expect(debeMigrarLocales(def, null, false)).toBe(false);
    expect(debeMigrarLocales(def, def, false)).toBe(false);
    expect(debeMigrarLocales({ ...def, habilitado: true }, propio, false)).toBe(false);
  });
});

describe('sincronizarAjustes', () => {
  beforeEach(() => localStorage.clear());
  const DEF = { RestTimerEnabled: 0, RestTimerDefaultSec: 90, RestTimerAutoStart: 1 };
  const mk = (usuario: any) => {
    const guardados: any[] = [];
    const deps: DepsSync = {
      leerUsuario: async () => usuario,
      guardar: async (c) => {
        guardados.push(c);
        return {
          RestTimerEnabled: c.enabled ?? usuario.RestTimerEnabled,
          RestTimerDefaultSec: c.defaultSec ?? usuario.RestTimerDefaultSec,
          RestTimerAutoStart: c.autoStart ?? usuario.RestTimerAutoStart,
        };
      },
    };
    return { deps, guardados };
  };

  it('adopta lo que dice el servidor', async () => {
    localStorage.setItem('mypr_rest_timer_migrated', '1');
    const { deps, guardados } = mk({ RestTimerEnabled: 1, RestTimerDefaultSec: 150, RestTimerAutoStart: 1 });
    expect(await sincronizarAjustes(deps)).toEqual({ habilitado: true, duracionSeg: 150, autoIniciar: true });
    expect(guardados).toEqual([]);
  });

  it('migración única: sube los ajustes locales antiguos si el servidor tiene los defectos', async () => {
    localStorage.setItem('mypr_rest_timer_settings', JSON.stringify({ habilitado: true, duracionSeg: 120, autoIniciar: false }));
    const { deps, guardados } = mk(DEF);
    expect(await sincronizarAjustes(deps)).toEqual({ habilitado: true, duracionSeg: 120, autoIniciar: false });
    expect(guardados).toEqual([{ enabled: true, defaultSec: 120, autoStart: false }]);
    // Segunda vez: ya migrado, no vuelve a subir
    const otra = mk(DEF);
    expect(await sincronizarAjustes(otra.deps)).toEqual({ habilitado: false, duracionSeg: 90, autoIniciar: true });
    expect(otra.guardados).toEqual([]);
  });

  it('no migra si el servidor ya tiene ajustes propios', async () => {
    localStorage.setItem('mypr_rest_timer_settings', JSON.stringify({ habilitado: true, duracionSeg: 120, autoIniciar: true }));
    const { deps, guardados } = mk({ RestTimerEnabled: 1, RestTimerDefaultSec: 60, RestTimerAutoStart: 1 });
    expect((await sincronizarAjustes(deps)).duracionSeg).toBe(60);
    expect(guardados).toEqual([]);
  });

  it('un cambio pendiente (sin conexión) se envía antes de leer', async () => {
    localStorage.setItem('mypr_rest_timer_pending', JSON.stringify({ defaultSec: 45 }));
    const { deps, guardados } = mk(DEF);
    const r = await sincronizarAjustes(deps);
    expect(guardados).toEqual([{ defaultSec: 45 }]);
    expect(r.duracionSeg).toBe(45);
    expect(localStorage.getItem('mypr_rest_timer_pending')).toBeNull();
  });

  it('si falla la red lanza el error y no toca la caché', async () => {
    localStorage.setItem('mypr_rest_timer_settings', JSON.stringify({ habilitado: true, duracionSeg: 120, autoIniciar: true }));
    const deps: DepsSync = { leerUsuario: async () => { throw new Error('offline'); }, guardar: async () => DEF };
    await expect(sincronizarAjustes(deps)).rejects.toThrow('offline');
    expect(leerAjustes().duracionSeg).toBe(120);
  });
});

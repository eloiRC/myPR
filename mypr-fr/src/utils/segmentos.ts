// Mapa de caracteres a segmentos de un display de 7 segmentos (a-g) y troceado del texto en celdas.

const MAPA: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abfgcd',
  '-': 'g', ' ': '', P: 'abefg', R: 'eg', r: 'eg', E: 'adefg', S: 'afgcd',
};

export function segmentosDe(char: string): string[] {
  return (MAPA[char] ?? MAPA[char.toUpperCase()] ?? '').split('');
}

export type Celda =
  | { tipo: 'digito'; char: string }
  | { tipo: 'punto' }
  | { tipo: 'dospuntos' }
  | { tipo: 'hueco' };

/** Trocea un texto en celdas del display. ',' y '.' son el punto decimal; ':' los dos puntos. */
export function celdasDe(texto: string): Celda[] {
  const out: Celda[] = [];
  for (const ch of texto) {
    if (ch === '.' || ch === ',') out.push({ tipo: 'punto' });
    else if (ch === ':') out.push({ tipo: 'dospuntos' });
    else if (ch === ' ') out.push({ tipo: 'hueco' });
    else out.push({ tipo: 'digito', char: ch });
  }
  return out;
}

/** Formatea segundos como m:ss para el display. */
export function mmss(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Kg para el display: sin ceros sobrantes (82.5, 80, 22.75 → 22.8). */
export function kgDisplay(kg: number): string {
  const r = Math.round(kg * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

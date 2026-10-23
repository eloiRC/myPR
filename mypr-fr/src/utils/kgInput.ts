import { evaluarFormulaPeso, formatKgInput } from './pesoFormula';

export const PASO_KG = 2.5;
export const PASO_REPS = 1;

/** Mientras se escribe: devuelve el número, o null si es una fórmula en curso («=...») o no es un número. */
export function parseKgEscrito(raw: string): number | null {
  if (raw.startsWith('=')) return null;
  const num = parseFloat(raw);
  return isNaN(num) ? null : num;
}

export type ResultadoKgBlur =
  | { tipo: 'nada' }
  | { tipo: 'formula'; valor: number; texto: string }
  | { tipo: 'invalida'; texto: string };

/** Al salir del campo: resuelve una fórmula («=20x2+20») o indica que es inválida y qué texto restaurar. */
export function resolverKgAlSalir(raw: string, actual: number): ResultadoKgBlur {
  const limpio = raw.trim();
  if (!limpio.startsWith('=')) return { tipo: 'nada' };
  const resultado = evaluarFormulaPeso(limpio);
  if (resultado !== null) return { tipo: 'formula', valor: resultado, texto: String(resultado) };
  return { tipo: 'invalida', texto: formatKgInput(actual) };
}

export function sumarKg(kg: number, delta: number): number {
  return Math.max(0, Math.round((kg + delta) * 100) / 100);
}

export function sumarReps(reps: number, delta: number): number {
  return Math.max(0, Math.round(reps + delta));
}

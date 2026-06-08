export function evaluarFormulaPeso(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('=')) return null;
  const expr = trimmed.slice(1).trim();
  if (!expr) return null;
  const normalized = expr.replace(/x/g, '*').replace(/÷/g, '/');
  if (!/^[\d+\-*/().\s]+$/.test(normalized)) return null;
  let balance = 0;
  for (const c of normalized) {
    if (c === '(') balance++;
    if (c === ')') balance--;
    if (balance < 0) return null;
  }
  if (balance !== 0) return null;
  try {
    const result = Function(`"use strict"; return (${normalized});`)();
    if (typeof result !== 'number' || !isFinite(result) || result < 0) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

export function formatKgInput(kg: number): string {
  return kg === 0 ? '' : String(kg);
}

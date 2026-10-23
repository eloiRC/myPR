import { describe, it, expect } from 'vitest';
import { puedeTerminarTrasHerramientas } from '../llm/loop';
import { TERMINAL_TOOLS } from '../coachTools';
import type { LlmMessage } from '../llm/types';

const ok = (n: number): LlmMessage => ({ role: 'tool_results', results: Array.from({ length: n }, (_, i) => ({ id: String(i), content: '{}', isError: false })) });
const call = (name: string) => ({ id: name, name, args: {} });

describe('puedeTerminarTrasHerramientas', () => {
  it('termina si ya hay texto y solo hay herramientas terminales que han ido bien', () => {
    expect(puedeTerminarTrasHerramientas('Vale, añado las series.', [call('add_sets'), call('suggest_replies')], ok(2), TERMINAL_TOOLS)).toBe(true);
  });
  it('no termina sin texto previo (el modelo debe explicar algo)', () => {
    expect(puedeTerminarTrasHerramientas('   ', [call('add_sets')], ok(1), TERMINAL_TOOLS)).toBe(false);
  });
  it('no termina si alguna herramienta falla', () => {
    const r: LlmMessage = { role: 'tool_results', results: [{ id: 'a', content: '{"error":"x"}', isError: true }] };
    expect(puedeTerminarTrasHerramientas('Vale.', [call('add_sets')], r, TERMINAL_TOOLS)).toBe(false);
  });
  it('no termina con herramientas que necesitan continuación (create_exercise)', () => {
    expect(puedeTerminarTrasHerramientas('Creo el ejercicio.', [call('create_exercise')], ok(1), TERMINAL_TOOLS)).toBe(false);
  });
  it('sin lista de terminales, nunca termina antes', () => {
    expect(puedeTerminarTrasHerramientas('Vale.', [call('add_sets')], ok(1), undefined)).toBe(false);
  });
});

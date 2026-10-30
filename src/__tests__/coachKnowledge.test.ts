import { describe, it, expect } from 'vitest';
import { COACH_KNOWLEDGE } from '../coachKnowledge';

describe('COACH_KNOWLEDGE', () => {
	it('tiene un tamaño razonable para el prompt', () => {
		expect(COACH_KNOWLEDGE.length).toBeGreaterThanOrEqual(6000);
		expect(COACH_KNOWLEDGE.length).toBeLessThanOrEqual(16000);
	});

	it('incluye las secciones clave', () => {
		expect(COACH_KNOWLEDGE).toContain('VOLUMEN Y FRECUENCIA');
		expect(COACH_KNOWLEDGE).toContain('DESCANSOS');
		expect(COACH_KNOWLEDGE).toContain('DOLOR Y MOLESTIAS');
	});

	it('no incluye referencias bibliográficas', () => {
		expect(COACH_KNOWLEDGE).not.toMatch(/PMID/);
		expect(COACH_KNOWLEDGE.toLowerCase()).not.toContain('doi');
	});
});

describe('integración en el prompt del entrenador', () => {
  it('la base de conocimiento va en el bloque estable y la pista de lesiones en el variable', async () => {
    const { COACH_PERSONA, renderInjuryHint } = await import('../coachPrompt');
    const { COACH_KNOWLEDGE } = await import('../coachKnowledge');
    expect(COACH_PERSONA).toContain(COACH_KNOWLEDGE);
    const mem = (Kind: string, Text: string, Status = 'activa') => ({ MemoryId: 1, UserId: 1, Kind, Text, Status, CreatedAt: 0, UpdatedAt: 0 }) as any;
    expect(renderInjuryHint([])).toBe('');
    expect(renderInjuryHint([mem('lesion', 'Molestia en el hombro derecho')])).toContain('zona: hombro');
    expect(renderInjuryHint([mem('lesion', 'Rodilla', 'resuelta')])).toBe('');
    expect(renderInjuryHint([mem('objetivo', 'hombros grandes')])).toBe('');
  });
});

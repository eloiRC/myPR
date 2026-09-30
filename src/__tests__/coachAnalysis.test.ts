import { describe, it, expect } from 'vitest';
import { analyzeTraining, buildSessions, type HistoryRow, type ExerciseRow } from '../coachAnalysis';

const DAY = 86400;
const NOW = 1_800_000_000;

const exercises: ExerciseRow[] = [
  { ExerciciId: 1, Nom: 'Press Banca', PR: 100, GrupMuscular1: 1, GrupMuscular2: 4 },
  { ExerciciId: 2, Nom: 'Sentadilla', PR: 140, GrupMuscular1: 9 },
  { ExerciciId: 3, Nom: 'Press Inclinado', PR: 70, GrupMuscular1: 1 },
  { ExerciciId: 4, Nom: 'Curl Femoral', PR: 0, GrupMuscular1: 11 },
];
const muscleGroups = [
  { GrupMuscularId: 1, Nom: 'Pectoral' },
  { GrupMuscularId: 4, Nom: 'Triceps' },
  { GrupMuscularId: 9, Nom: 'Quadriceps' },
  { GrupMuscularId: 11, Nom: 'Femoral' },
];

function row(entrenoId: number, daysAgo: number, exId: number, kg: number, reps: number): HistoryRow {
  return { EntrenoId: entrenoId, Nom: `E${entrenoId}`, Data: NOW - daysAgo * DAY, ExerciciId: exId, NomExercici: null, Kg: kg, Reps: reps };
}

describe('buildSessions', () => {
  it('drops warm-up sets below 50% of the session max', () => {
    const [s] = buildSessions([row(1, 1, 1, 20, 10), row(1, 1, 1, 80, 8), row(1, 1, 1, 80, 8)]);
    expect(s.exercises.get(1)).toEqual([{ kg: 80, reps: 8 }, { kg: 80, reps: 8 }]);
  });

  it('orders sessions newest first', () => {
    const sessions = buildSessions([row(1, 10, 1, 80, 8), row(2, 2, 2, 100, 5)]);
    expect(sessions.map(s => s.entrenoId)).toEqual([2, 1]);
  });
});

describe('analyzeTraining', () => {
  const rows = [
    // Press banca estancado: mismo top set 4 sesiones
    row(1, 1, 1, 80, 8), row(2, 4, 1, 80, 8), row(3, 7, 1, 80, 8), row(4, 10, 1, 80, 8),
    // Sentadilla hace 30 días
    row(5, 30, 2, 120, 5),
  ];
  const result = analyzeTraining({ rows, exercises, muscleGroups, now: NOW });

  it('flags stagnant exercises', () => {
    expect(result.text).toMatch(/ESTANCADOS[^#]*Press Banca/);
  });

  it('lists unused exercises as rotation candidates', () => {
    const rotation = result.text.split('### CANDIDATOS DE ROTACIÓN')[1].split('###')[0];
    expect(rotation).toContain('Sentadilla (hace 30d)');
    expect(rotation).toContain('Press Inclinado (nunca usado)');
    expect(rotation).not.toContain('Press Banca');
  });

  it('ranks the most rested muscle groups first', () => {
    const fresh = result.text.split('### FRESCURA')[1].split('###')[0].trim().split('\n').slice(1);
    expect(fresh[0]).toContain('Femoral: nunca');
    expect(fresh[fresh.length - 1]).toMatch(/Pectoral|Triceps/);
  });

  it('only accepts catalog exercise ids', () => {
    expect([...result.validExerciseIds].sort()).toEqual([1, 2, 3, 4]);
  });

  it('rotates the session focus as sessions accumulate', () => {
    const a = analyzeTraining({ rows, exercises, muscleGroups, now: NOW }).focus.nom;
    const b = analyzeTraining({ rows: [...rows, row(6, 0, 3, 60, 10)], exercises, muscleGroups, now: NOW }).focus.nom;
    expect(a).not.toBe(b);
  });
});

// Análisis precalculado para el coach IA.
// En lugar de pasar cientos de filas crudas al modelo (que acaba copiando la última sesión),
// le damos señales ya digeridas: frescura por grupo muscular, estancamientos,
// candidatos de rotación y un enfoque de sesión que va cambiando.

export interface HistoryRow {
  EntrenoId: number;
  Nom: string | null;
  Data: number; // unix seconds
  ExerciciId: number | null;
  NomExercici: string | null;
  Kg: number | null;
  Reps: number | null;
}

export interface ExerciseRow {
  ExerciciId: number;
  Nom: string;
  PR: number | null;
  GrupMuscular1?: number | null;
  GrupMuscular2?: number | null;
  GrupMuscular3?: number | null;
  GrupMuscular4?: number | null;
  GrupMuscular5?: number | null;
}

interface SetInfo { kg: number; reps: number }
interface Session {
  entrenoId: number;
  nom: string;
  data: number;
  // ExerciciId -> series de trabajo, en orden
  exercises: Map<number, SetInfo[]>;
}

const DAY = 86400;

export const SESSION_FOCUSES = [
  { nom: 'FUERZA', reps: '3-6 reps', descanso: '2-4 min', rir: 'RIR 1-2', nota: 'Básicos pesados, menos series accesorias.' },
  { nom: 'HIPERTROFIA', reps: '8-12 reps', descanso: '60-120 s', rir: 'RIR 1-2', nota: 'Volumen moderado, variantes de ángulo y unilaterales.' },
  { nom: 'METABÓLICO / BOMBEO', reps: '12-20 reps', descanso: '45-75 s', rir: 'RIR 0-2', nota: 'Máquinas, poleas, superseries o drop sets en el último set.' },
] as const;

export function muscleGroupsOf(ex: ExerciseRow): number[] {
  return [ex.GrupMuscular1, ex.GrupMuscular2, ex.GrupMuscular3, ex.GrupMuscular4, ex.GrupMuscular5]
    .filter((g): g is number => typeof g === 'number' && g > 0);
}

export function buildSessions(rows: HistoryRow[]): Session[] {
  const map = new Map<number, Session>();
  for (const r of rows) {
    let s = map.get(r.EntrenoId);
    if (!s) {
      s = { entrenoId: r.EntrenoId, nom: r.Nom || '', data: Number(r.Data) || 0, exercises: new Map() };
      map.set(r.EntrenoId, s);
    }
    if (r.ExerciciId && r.Reps) {
      const list = s.exercises.get(r.ExerciciId) || [];
      list.push({ kg: Number(r.Kg) || 0, reps: Number(r.Reps) || 0 });
      s.exercises.set(r.ExerciciId, list);
    }
  }
  // Filtro anti-ruido: descarta series de aproximación (<50% del peso máximo de ese ejercicio en la sesión)
  for (const s of map.values()) {
    for (const [id, sets] of s.exercises) {
      const max = Math.max(...sets.map(x => x.kg));
      const working = max > 0 ? sets.filter(x => x.kg >= max * 0.5) : sets;
      s.exercises.set(id, working);
    }
  }
  return Array.from(map.values())
    .filter(s => s.exercises.size > 0)
    .sort((a, b) => b.data - a.data);
}

function daysAgo(ts: number, now: number): number {
  return Math.max(0, Math.floor((now - ts) / DAY));
}

function fmtSets(sets: SetInfo[]): string {
  // Agrupa series consecutivas iguales: 80kg×8 ×3
  const out: string[] = [];
  let i = 0;
  while (i < sets.length) {
    let j = i;
    while (j + 1 < sets.length && sets[j + 1].kg === sets[i].kg && sets[j + 1].reps === sets[i].reps) j++;
    const n = j - i + 1;
    out.push(`${n > 1 ? n + '×' : ''}${sets[i].kg}kg×${sets[i].reps}`);
    i = j + 1;
  }
  return out.join(', ');
}

const e1rm = (s: SetInfo) => s.kg * (1 + s.reps / 30); // Epley

function bestSet(sets: SetInfo[]): SetInfo {
  return sets.reduce((best, s) => (e1rm(s) > e1rm(best) ? s : best), sets[0]);
}

function bestE1RM(sets: SetInfo[]): number {
  return sets.length ? e1rm(bestSet(sets)) : 0;
}

export interface CoachAnalysis {
  focus: typeof SESSION_FOCUSES[number];
  text: string;
  validExerciseIds: Set<number>;
}

export function analyzeTraining(opts: {
  rows: HistoryRow[];
  exercises: ExerciseRow[];
  muscleGroups: { GrupMuscularId: number; Nom: string }[];
  now?: number; // unix seconds
}): CoachAnalysis {
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  const sessions = buildSessions(opts.rows);
  const exById = new Map(opts.exercises.map(e => [e.ExerciciId, e]));
  const gmName = new Map(opts.muscleGroups.map(g => [g.GrupMuscularId, g.Nom]));
  const exName = (id: number) => exById.get(id)?.Nom ?? `#${id}`;

  // --- Uso por ejercicio ---
  const lastUsed = new Map<number, number>();
  const uses28 = new Map<number, number>();
  const perExerciseHistory = new Map<number, SetInfo[][]>(); // más reciente primero
  for (const s of sessions) {
    for (const [id, sets] of s.exercises) {
      if (!lastUsed.has(id)) lastUsed.set(id, s.data);
      if (now - s.data <= 28 * DAY) uses28.set(id, (uses28.get(id) || 0) + 1);
      const h = perExerciseHistory.get(id) || [];
      h.push(sets);
      perExerciseHistory.set(id, h);
    }
  }

  // --- Frescura y volumen por grupo muscular ---
  const gmLast = new Map<number, number>();
  const gmSets7 = new Map<number, number>();
  for (const s of sessions) {
    for (const [id, sets] of s.exercises) {
      const ex = exById.get(id);
      if (!ex) continue;
      for (const g of muscleGroupsOf(ex)) {
        if (!gmLast.has(g)) gmLast.set(g, s.data);
        if (now - s.data <= 7 * DAY) gmSets7.set(g, (gmSets7.get(g) || 0) + sets.length);
      }
    }
  }
  const usedGroups = new Set(opts.exercises.flatMap(muscleGroupsOf));
  const gmLines = Array.from(usedGroups)
    .map(g => ({ g, days: gmLast.has(g) ? daysAgo(gmLast.get(g)!, now) : Infinity, sets: gmSets7.get(g) || 0 }))
    .sort((a, b) => b.days - a.days)
    .map(x => `- ${gmName.get(x.g) ?? 'Grupo ' + x.g}: ${x.days === Infinity ? 'nunca/sin datos' : `hace ${x.days} días`} · ${x.sets} series efectivas últimos 7 días`);

  // --- Estancamientos (e1RM sin mejorar en las 3 últimas sesiones del ejercicio) ---
  const stagnant: string[] = [];
  const progressing: string[] = [];
  for (const [id, hist] of perExerciseHistory) {
    if (hist.length < 3) continue;
    const [a, b, c, d] = hist.map(bestE1RM);
    const ref = d ?? c;
    if (a <= ref * 1.005 && b <= ref * 1.005) {
      stagnant.push(`${exName(id)} (${d !== undefined ? 4 : 3} sesiones sin mejorar, mejor serie reciente ${fmtSets([bestSet(hist[0])])})`);
    }
    else if (a > c * 1.01) progressing.push(exName(id));
  }

  // --- Candidatos de rotación: ejercicios del catálogo no usados en 21+ días ---
  const rotationByGroup = new Map<string, string[]>();
  for (const ex of opts.exercises) {
    const last = lastUsed.get(ex.ExerciciId);
    const days = last ? daysAgo(last, now) : Infinity;
    if (days < 21) continue;
    const g = muscleGroupsOf(ex)[0];
    const key = g ? (gmName.get(g) ?? 'Otros') : 'Otros';
    const list = rotationByGroup.get(key) || [];
    list.push(`${ex.Nom}${days === Infinity ? ' (nunca usado)' : ` (hace ${days}d)`}`);
    rotationByGroup.set(key, list);
  }
  const rotationLines = Array.from(rotationByGroup.entries()).map(([g, l]) => `- ${g}: ${l.slice(0, 6).join('; ')}`);

  // --- Enfoque de la sesión (periodización ondulante diaria) ---
  const sessionsLast7 = sessions.filter(s => now - s.data <= 7 * DAY).length;
  const focus = SESSION_FOCUSES[(sessions.length + sessionsLast7) % SESSION_FOCUSES.length];

  // --- Catálogo enriquecido ---
  const catalog = opts.exercises.map(ex => {
    const groups = muscleGroupsOf(ex).map(g => gmName.get(g) ?? g).join('/') || 'sin grupo';
    const last = lastUsed.get(ex.ExerciciId);
    const usage = last ? `último hace ${daysAgo(last, now)}d, ${uses28.get(ex.ExerciciId) || 0}× en 28d` : 'nunca usado';
    return `ID: ${ex.ExerciciId} - ${ex.Nom} [${groups}] (${usage}${ex.PR ? `, PR ${ex.PR}kg` : ''})`;
  });

  // --- Resumen compacto de las últimas sesiones ---
  const recent = sessions.slice(0, 12).map(s => {
    const parts = Array.from(s.exercises.entries()).map(([id, sets]) => `${exName(id)}: ${fmtSets(sets)}`);
    return `- hace ${daysAgo(s.data, now)}d · ${s.nom || 'Sin nombre'} → ${parts.join(' | ')}`;
  });

  // Ejercicios de las 2 últimas sesiones: no copiarlos como accesorios
  const recentlyUsed = new Set<number>();
  sessions.slice(0, 2).forEach(s => s.exercises.forEach((_, id) => recentlyUsed.add(id)));

  const section = (title: string, lines: string[], empty = 'Sin datos.') =>
    `### ${title}\n${lines.length ? lines.join('\n') : empty}`;

  const text = [
    section('ENFOQUE SUGERIDO PARA HOY (rotación ondulante)', [
      `${focus.nom}: ${focus.reps}, descanso ${focus.descanso}, ${focus.rir}. ${focus.nota}`,
    ]),
    section('FRESCURA POR GRUPO MUSCULAR (más descansado primero)', gmLines),
    section('ÚLTIMAS SESIONES (solo series de trabajo)', recent),
    section('EJERCICIOS ESTANCADOS (candidatos a cambiar variante o esquema)', stagnant, 'Ninguno detectado.'),
    section('EJERCICIOS PROGRESANDO (mantener)', progressing, 'Ninguno detectado.'),
    section('CANDIDATOS DE ROTACIÓN (no usados en 21+ días)', rotationLines, 'Ninguno: el usuario usa todo su catálogo.'),
    section('USADOS EN LAS 2 ÚLTIMAS SESIONES (evita repetirlos como accesorios)', Array.from(recentlyUsed).map(id => `- ${exName(id)}`), 'Ninguno.'),
    section('CATÁLOGO DE EJERCICIOS (usa SOLO estos IDs)', catalog),
  ].join('\n\n');

  return { focus, text, validExerciseIds: new Set(opts.exercises.map(e => e.ExerciciId)) };
}

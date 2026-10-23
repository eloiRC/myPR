// Herramientas del coach IA. Todas se ejecutan en el servidor.
// userId y entrenoId vienen SIEMPRE del JWT y del entreno actual, nunca del modelo.
import { z } from 'zod';
import type { LlmToolDef } from './llm/types';
import { restSegOrNoneSchema, REST_MIN_SEG, REST_MAX_SEG } from './schema';
import { MEMORY_KINDS, MEMORY_STATUSES, MAX_MEMORY_TEXT, deleteMemory, insertMemory, updateMemory } from './coachMemory';

export const MAX_SETS_PER_CALL = 30;
export const MAX_ACTIVE_MEMORIES = 50;
export const AUTO_NAME_REGEX = /^Entreno #\d+$/;

// ---------- Schemas de entrada (zod) ----------

const kgSchema = z.number().min(0).max(1000);
const repsSchema = z.number().int().positive().max(1000);
const idSchema = z.number().int().positive();
// Descanso en segundos (15-900). En edit_set / set_exercise_rest, null = borrar el valor.
const restSchema = restSegOrNoneSchema;

export const addSetsInput = z.object({
  sets: z.array(z.object({ exerciseId: idSchema, kg: kgSchema, reps: repsSchema, restSec: restSchema.nullable().optional() })).min(1).max(MAX_SETS_PER_CALL),
});
export const editSetInput = z.object({
  serieId: idSchema,
  exerciseId: idSchema.optional(),
  kg: kgSchema.optional(),
  reps: repsSchema.optional(),
  restSec: restSchema.nullable().optional(),
}).refine(v => v.exerciseId !== undefined || v.kg !== undefined || v.reps !== undefined || v.restSec !== undefined, { message: 'Indica al menos un campo a cambiar' });
export const setExerciseRestInput = z.object({ exerciseId: idSchema, restSec: restSchema.nullable() });
export const deleteSetInput = z.object({ serieId: idSchema });
export const updateWorkoutInput = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  rating: z.number().int().min(1).max(5).optional(),
}).refine(v => v.name !== undefined || v.description !== undefined || v.rating !== undefined, { message: 'Indica al menos un campo a cambiar' });
export const createExerciseInput = z.object({
  name: z.string().trim().min(3).max(80),
  muscleGroupIds: z.array(idSchema).min(1).max(5),
});
export const saveMemoryInput = z.object({
  kind: z.enum(MEMORY_KINDS),
  text: z.string().trim().min(3).max(MAX_MEMORY_TEXT),
});
export const updateMemoryInput = z.object({
  id: idSchema,
  text: z.string().trim().min(3).max(MAX_MEMORY_TEXT).optional(),
  status: z.enum(MEMORY_STATUSES).optional(),
}).refine(v => v.text !== undefined || v.status !== undefined, { message: 'Indica texto o estado' });
export const deleteMemoryInput = z.object({ id: idSchema });
export const MAX_QUICK_REPLY_LENGTH = 40;
export const suggestRepliesInput = z.object({
  options: z.array(z.string().trim().min(1).max(MAX_QUICK_REPLY_LENGTH)).min(2).max(4),
});

// ---------- Definiciones JSON Schema para el modelo ----------
// Sin minimum/maximum/maxItems: algunos proveedores no los admiten en modo estricto; los rangos se validan con zod.

const obj = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object', properties, required, additionalProperties: false,
});

export const TOOL_DEFS: LlmToolDef[] = [
  {
    name: 'add_sets',
    description: `Añade series al entreno actual. Una entrada por serie individual (4 series iguales = 4 entradas). Máximo ${MAX_SETS_PER_CALL} por llamada. Usa SOLO exerciseId del catálogo del usuario (o de un ejercicio creado antes con create_exercise). kg con máximo 1 decimal (0 permitido solo para peso corporal), reps entero positivo. restSec (opcional, úsalo solo cuando aporte algo): descanso en segundos de ESA serie (${REST_MIN_SEG} a ${REST_MAX_SEG}), o 0 para "sin descanso" (superserie/circuito: el temporizador no arranca). Omítelo para heredar el del ejercicio o el del usuario.`,
    parameters: obj({
      sets: { type: 'array', items: obj({ exerciseId: { type: 'integer' }, kg: { type: 'number' }, reps: { type: 'integer' }, restSec: { type: ['integer', 'null'] } }, ['exerciseId', 'kg', 'reps']) },
    }, ['sets']),
  },
  {
    name: 'edit_set',
    description: `Modifica una serie del entreno actual (ejercicio, kg, reps y/o descanso). serieId sale de "Series ya realizadas hoy". Solo envía los campos que cambian. restSec: descanso propio de la serie en segundos (${REST_MIN_SEG} a ${REST_MAX_SEG}), 0 = sin descanso; null lo borra y la serie vuelve a heredar el del ejercicio.`,
    parameters: obj({ serieId: { type: 'integer' }, exerciseId: { type: 'integer' }, kg: { type: 'number' }, reps: { type: 'integer' }, restSec: { type: ['integer', 'null'] } }, ['serieId']),
  },
  {
    name: 'set_exercise_rest',
    description: `Fija el descanso POR DEFECTO de un ejercicio del catálogo del usuario (segundos, ${REST_MIN_SEG} a ${REST_MAX_SEG}, o 0 = sin descanso); se aplica a sus series que no tengan descanso propio. restSec null borra el valor y vuelve al descanso global del usuario. Úsalo solo para valores estables del ejercicio (ej. peso muerto pesado 180 s), no para una sesión concreta.`,
    parameters: obj({ exerciseId: { type: 'integer' }, restSec: { type: ['integer', 'null'] } }, ['exerciseId', 'restSec']),
  },
  {
    name: 'delete_set',
    description: 'Borra una serie del entreno actual. Acción destructiva: antes pide confirmación al usuario en el chat y llama a esta herramienta solo tras un sí claro.',
    parameters: obj({ serieId: { type: 'integer' } }, ['serieId']),
  },
  {
    name: 'update_workout',
    description: 'Actualiza nombre, descripción y/o puntuación (1 a 5) del entreno actual. El nombre solo se pone automáticamente si el actual sigue siendo automático ("Entreno #N"), salvo que el usuario pida cambiarlo.',
    parameters: obj({ name: { type: 'string' }, description: { type: 'string' }, rating: { type: 'integer' } }, []),
  },
  {
    name: 'create_exercise',
    description: 'Crea un ejercicio nuevo en el catálogo del usuario. Úsalo solo si no existe uno equivalente en el catálogo. muscleGroupIds: de 1 a 5 ids del catálogo de grupos musculares. Devuelve el exerciseId para usarlo en add_sets.',
    parameters: obj({ name: { type: 'string' }, muscleGroupIds: { type: 'array', items: { type: 'integer' } } }, ['name', 'muscleGroupIds']),
  },
  {
    name: 'save_memory',
    description: 'Guarda un dato duradero e importante del usuario (lesión o dolor, objetivo, restricción de material u horario, preferencia fuerte). No guardes trivialidades. Si ya existe una memoria parecida usa update_memory en lugar de duplicar.',
    parameters: obj({ kind: { type: 'string', enum: [...MEMORY_KINDS] }, text: { type: 'string' } }, ['kind', 'text']),
  },
  {
    name: 'update_memory',
    description: 'Actualiza el texto de una memoria existente y/o su estado (activa o resuelta). Marca como resuelta una lesión cuando el usuario diga que ya está bien.',
    parameters: obj({ id: { type: 'integer' }, text: { type: 'string' }, status: { type: 'string', enum: [...MEMORY_STATUSES] } }, ['id']),
  },
  {
    name: 'delete_memory',
    description: 'Elimina una memoria. Úsalo solo si el usuario lo pide o la memoria es claramente errónea.',
    parameters: obj({ id: { type: 'integer' } }, ['id']),
  },
  {
    name: 'suggest_replies',
    description: `Muestra al usuario botones de respuesta rápida bajo tu mensaje. Llámala AL FINAL del turno (tras tu texto) cuando propongas algo que necesita su confirmación o una elección. options: de 2 a 4 respuestas cortas en español (máximo ${MAX_QUICK_REPLY_LENGTH} caracteres cada una), tal como las escribiría el usuario; la primera, una confirmación positiva. No cambia ningún dato.`,
    parameters: obj({ options: { type: 'array', items: { type: 'string' } } }, ['options']),
  },
];

// ---------- Contexto y ejecución ----------

export interface ToolDeps {
  addSerie(exerciciId: number, kg: number, reps: number, restSec?: number | null): Promise<{ serieId: number; newPr: boolean; cargaTotal: number }>;
  checkPr(exerciciId: number, kg: number): Promise<unknown>;
  updateCargaTotal(entrenoId: number): Promise<{ results?: any[] }>;
}

export interface ToolContext {
  db: D1Database;
  userId: number;
  entrenoId: number;
  validExerciseIds: Set<number>;
  validMuscleGroupIds: Set<number>;
  deps: ToolDeps;
  state: { workoutUpdated: boolean; /** respuestas rápidas sugeridas (la última llamada gana) */ quickReplies?: string[] };
}

export interface ToolResult { content: string; isError: boolean }

const ok = (data: unknown): ToolResult => ({ content: JSON.stringify(data), isError: false });
const fail = (error: string): ToolResult => ({ content: JSON.stringify({ error }), isError: true });

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Capitaliza la primera letra de cada palabra (igual que el frontend). */
export function capitalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').replace(/(^|\s)(\p{L})/gu, (_, sp, ch) => sp + ch.toUpperCase());
}

export function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Devuelve los ids que no están en el catálogo válido. */
export function findInvalidExerciseIds(ids: number[], valid: Set<number>): number[] {
  return Array.from(new Set(ids.filter(id => !valid.has(id))));
}

function zodMessage(e: z.ZodError): string {
  return e.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
}

async function getOwnSet(ctx: ToolContext, serieId: number) {
  return ctx.db.prepare('SELECT * FROM Series WHERE SerieId = ? AND UserId = ? AND EntrenoId = ?')
    .bind(serieId, ctx.userId, ctx.entrenoId).first<any>();
}

export async function executeTool(ctx: ToolContext, name: string, rawArgs: unknown): Promise<ToolResult> {
  try {
    switch (name) {
      case 'add_sets': {
        const p = addSetsInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const invalid = findInvalidExerciseIds(p.data.sets.map(s => s.exerciseId), ctx.validExerciseIds);
        if (invalid.length) return fail(`exerciseId no válidos (no están en el catálogo): ${invalid.join(', ')}. No se ha añadido ninguna serie.`);
        const added: { serieId: number; exerciseId: number; kg: number; reps: number; restSec: number | null; newPr: boolean }[] = [];
        let cargaTotal = 0;
        try {
          for (const s of p.data.sets) {
            const kg = round1(s.kg);
            const restSec = s.restSec ?? null;
            const r = await ctx.deps.addSerie(s.exerciseId, kg, s.reps, restSec);
            ctx.state.workoutUpdated = true;
            cargaTotal = r.cargaTotal;
            added.push({ serieId: r.serieId, exerciseId: s.exerciseId, kg, reps: s.reps, restSec, newPr: r.newPr });
          }
        } catch (e: any) {
          return fail(`Error tras añadir ${added.length} series: ${e?.message || 'error de base de datos'}`);
        }
        return ok({ added, cargaTotal });
      }

      case 'edit_set': {
        const p = editSetInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const row = await getOwnSet(ctx, p.data.serieId);
        if (!row) return fail('Serie no encontrada en el entreno actual.');
        const exerciseId = p.data.exerciseId ?? row.ExerciciId;
        if (!ctx.validExerciseIds.has(exerciseId)) return fail(`exerciseId no válido: ${exerciseId}`);
        const kg = round1(p.data.kg ?? row.Kg);
        const reps = p.data.reps ?? row.Reps;
        // Mirror de /api/editSerie
        // restSec: ausente = no tocar, null = borrar, número = fijar
        const restSec = p.data.restSec === undefined ? (row.DescansoSeg ?? null) : p.data.restSec;
        await ctx.db.prepare('UPDATE Series SET ExerciciId=?, Kg=?, Reps=?, Carga=?, DescansoSeg=? WHERE UserId=? AND SerieId=? AND EntrenoId=?')
          .bind(exerciseId, kg, reps, kg * reps, restSec, ctx.userId, row.SerieId, ctx.entrenoId).run();
        const pr = await ctx.deps.checkPr(exerciseId, kg) as { prUpdated?: boolean; serieId?: number } | undefined;
        // Si cambió de ejercicio, el PR del ejercicio anterior también se recalcula
        if (exerciseId !== row.ExerciciId) await ctx.deps.checkPr(row.ExerciciId, 0);
        const ct = await ctx.deps.updateCargaTotal(ctx.entrenoId);
        ctx.state.workoutUpdated = true;
        return ok({ serieId: row.SerieId, exerciseId, kg, reps, restSec, newPr: pr?.serieId === row.SerieId, cargaTotal: ct.results?.[0]?.CargaTotal ?? 0 });
      }

      case 'set_exercise_rest': {
        const p = setExerciseRestInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        if (!ctx.validExerciseIds.has(p.data.exerciseId)) return fail(`exerciseId no válido: ${p.data.exerciseId}`);
        const res = await ctx.db.prepare('UPDATE Exercici SET DescansoSeg = ? WHERE ExerciciId = ? AND UserId = ?')
          .bind(p.data.restSec, p.data.exerciseId, ctx.userId).run();
        if (!(res.meta.changes ?? 0)) return fail('Ejercicio no encontrado.');
        ctx.state.workoutUpdated = true; // el front recarga el catálogo y recoge el nuevo descanso
        return ok({ exerciseId: p.data.exerciseId, restSec: p.data.restSec });
      }

      case 'delete_set': {
        const p = deleteSetInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const row = await getOwnSet(ctx, p.data.serieId);
        if (!row) return fail('Serie no encontrada en el entreno actual.');
        // Mirror de /api/deleteSerie
        await ctx.db.prepare('DELETE FROM Series WHERE SerieId=? AND UserId=? AND EntrenoId=?').bind(row.SerieId, ctx.userId, ctx.entrenoId).run();
        await ctx.deps.checkPr(row.ExerciciId, 0);
        const ct = await ctx.deps.updateCargaTotal(ctx.entrenoId);
        ctx.state.workoutUpdated = true;
        return ok({ deleted: row.SerieId, cargaTotal: ct.results?.[0]?.CargaTotal ?? 0 });
      }

      case 'update_workout': {
        const p = updateWorkoutInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const res = await ctx.db.prepare(
          'UPDATE Entreno SET Nom = COALESCE(?, Nom), Descripcio = COALESCE(?, Descripcio), Puntuacio = COALESCE(?, Puntuacio) WHERE EntrenoId = ? AND UserId = ?'
        ).bind(p.data.name ?? null, p.data.description ?? null, p.data.rating ?? null, ctx.entrenoId, ctx.userId).run();
        if (!(res.meta.changes ?? 0)) return fail('Entreno no encontrado.');
        ctx.state.workoutUpdated = true;
        return ok({ updated: true, ...p.data });
      }

      case 'create_exercise': {
        const p = createExerciseInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const groups = Array.from(new Set(p.data.muscleGroupIds));
        const badGroups = groups.filter(g => !ctx.validMuscleGroupIds.has(g));
        if (badGroups.length) return fail(`muscleGroupIds no válidos: ${badGroups.join(', ')}`);
        const nombre = capitalizeName(p.data.name);
        // Duplicados del usuario, sin distinguir mayúsculas (toLowerCase de JS; el LOWER de SQLite solo cubre ASCII)
        const { results } = await ctx.db.prepare('SELECT ExerciciId, Nom FROM Exercici WHERE UserId = ?').bind(ctx.userId).all();
        const dup = (results as any[]).find(r => normalizeName(r.Nom) === normalizeName(nombre));
        if (dup) return fail(`Ya existe el ejercicio "${dup.Nom}" (exerciseId ${dup.ExerciciId}). Úsalo en lugar de crear otro.`);
        const [g1, g2, g3, g4, g5] = groups;
        const ins = await ctx.db.prepare(
          'INSERT INTO Exercici (Nom, UserId, PR, GrupMuscular1, GrupMuscular2, GrupMuscular3, GrupMuscular4, GrupMuscular5) VALUES (?, ?, 0, ?, ?, ?, ?, ?)'
        ).bind(nombre, ctx.userId, g1 ?? null, g2 ?? null, g3 ?? null, g4 ?? null, g5 ?? null).run();
        const exerciseId = Number(ins.meta.last_row_id);
        ctx.validExerciseIds.add(exerciseId); // válido para el resto del bucle
        ctx.state.workoutUpdated = true;
        return ok({ exerciseId, name: nombre });
      }

      case 'save_memory': {
        const p = saveMemoryInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const count = await ctx.db.prepare(`SELECT COUNT(*) AS n FROM CoachMemory WHERE UserId = ? AND Status = 'activa'`).bind(ctx.userId).first<{ n: number }>();
        if ((count?.n ?? 0) >= MAX_ACTIVE_MEMORIES) return fail('Demasiadas memorias activas. Actualiza o borra alguna antes de guardar otra.');
        const id = await insertMemory(ctx.db, ctx.userId, p.data.kind, p.data.text);
        return ok({ id, saved: true });
      }

      case 'update_memory': {
        const p = updateMemoryInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const done = await updateMemory(ctx.db, ctx.userId, p.data.id, { text: p.data.text, status: p.data.status });
        return done ? ok({ id: p.data.id, updated: true }) : fail('Memoria no encontrada.');
      }

      case 'delete_memory': {
        const p = deleteMemoryInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        const done = await deleteMemory(ctx.db, ctx.userId, p.data.id);
        return done ? ok({ id: p.data.id, deleted: true }) : fail('Memoria no encontrada.');
      }

      case 'suggest_replies': {
        const p = suggestRepliesInput.safeParse(rawArgs);
        if (!p.success) return fail(zodMessage(p.error));
        // Sin duplicados (ignorando mayúsculas); no toca datos ni workoutUpdated
        const seen = new Set<string>();
        const options = p.data.options.filter(o => { const k = o.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
        ctx.state.quickReplies = options;
        return ok({ shown: options.length });
      }

      default:
        return fail(`Herramienta desconocida: ${name}`);
    }
  } catch (e: any) {
    console.error(`Error en herramienta ${name}:`, e);
    return fail(e?.message || 'Error interno');
  }
}

/**
 * Herramientas tras las que no hace falta otra llamada al modelo si ya escribió su frase
 * (ver runToolLoop.terminalTools). create_exercise NO: suele ir seguida de add_sets.
 */
export const TERMINAL_TOOLS: ReadonlySet<string> = new Set([
  'add_sets', 'edit_set', 'delete_set', 'update_workout', 'set_exercise_rest',
  'save_memory', 'update_memory', 'delete_memory', 'suggest_replies',
]);

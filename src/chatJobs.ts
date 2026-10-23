// Estado de los jobs del chat en D1: el polling puede caer en un isolate distinto
// del que ejecuta el job, así que un Map en memoria no sirve.

export type ChatJobStatus = 'pending' | 'streaming' | 'done' | 'error';

export interface ChatJob {
  id: string;
  status: ChatJobStatus;
  fullText: string;
  workoutUpdated: boolean;
  error?: string;
  userId: number;
  createdAt: number;
  requestId?: string;
  /** Fase visible para el usuario (Pensando…, Escribiendo…, etiqueta de herramienta) */
  phase?: string;
  /** Última actividad del job (ms); undefined en filas anteriores a la migración 0007 */
  updatedAt?: number;
  /** Respuestas rápidas sugeridas por el coach (suggest_replies); solo en jobs terminados */
  quickReplies?: string[];
}

/** Lee la columna QuickReplies (JSON); ignora cualquier valor que no sea un array de textos. */
export function parseQuickReplies(raw: unknown): string[] | undefined {
  if (typeof raw !== 'string' || !raw) return undefined;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return undefined;
    const list = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    return list.length ? list : undefined;
  } catch {
    return undefined;
  }
}

// 24 h: si el usuario vuelve más tarde (pantalla bloqueada, app cerrada) aún puede recuperar la respuesta
const JOB_TTL_MS = 24 * 3600000;
// Cada cuánto se vuelca el texto en streaming a D1 (menos = el usuario lo ve antes)
const FLUSH_INTERVAL_MS = 400;
const MAX_REQUEST_ID_LENGTH = 100;
// Un job en curso sin actividad durante este tiempo se da por interrumpido
export const STALE_JOB_MS = 3 * 60000;
export const STALE_JOB_MESSAGE = 'La respuesta se interrumpió. Inténtalo de nuevo.';
export const RETRY_ABORT_MESSAGE = 'La respuesta se interrumpió a medias y no se repite para no duplicar cambios. Revisa el entreno e inténtalo de nuevo.';

export const PHASE_THINKING = 'Pensando…';
export const PHASE_WRITING = 'Escribiendo…';

// ---- Lógica pura (testeable sin D1) ----

/** Normaliza el requestId del cliente; undefined si falta o no es válido (clientes antiguos). */
export function normalizeRequestId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const id = raw.trim();
  if (!id || id.length > MAX_REQUEST_ID_LENGTH) return undefined;
  return id;
}

/** ¿Toca volcar el texto acumulado a D1? Throttle por tiempo. */
export function shouldFlush(now: number, lastFlush: number, pendingChars: number, intervalMs = FLUSH_INTERVAL_MS): boolean {
  return pendingChars > 0 && now - lastFlush >= intervalMs;
}

/** Etiqueta de fase mientras se ejecuta una herramienta (a partir de su nombre y argumentos). */
export function phaseForTool(name: string, args: unknown): string {
  switch (name) {
    case 'add_sets': {
      const sets = (args as any)?.sets;
      const n = Array.isArray(sets) ? sets.length : 0;
      if (n === 1) return 'Añadiendo 1 serie…';
      return n > 1 ? `Añadiendo ${n} series…` : 'Añadiendo series…';
    }
    case 'edit_set': return 'Editando una serie…';
    case 'delete_set': return 'Borrando una serie…';
    case 'update_workout': return 'Actualizando el entreno…';
    case 'create_exercise': return 'Creando ejercicio…';
    case 'save_memory':
    case 'update_memory':
    case 'delete_memory': return 'Actualizando memoria…';
    case 'set_exercise_rest': return 'Ajustando descanso…';
    default: return 'Trabajando…';
  }
}

/** ¿Un job en curso lleva demasiado tiempo sin actividad? (filas antiguas sin UpdatedAt: usa CreatedAt) */
export function isJobStale(job: Pick<ChatJob, 'status' | 'createdAt' | 'updatedAt'>, now: number, staleMs = STALE_JOB_MS): boolean {
  if (job.status !== 'pending' && job.status !== 'streaming') return false;
  const last = job.updatedAt ?? job.createdAt;
  return now - last > staleMs;
}

/** Estado que se expone en /api/chatStatus: un job caducado se informa como error. */
export function effectiveJobView(job: ChatJob, now: number): Pick<ChatJob, 'status' | 'fullText' | 'workoutUpdated' | 'error' | 'phase' | 'quickReplies'> {
  if (isJobStale(job, now)) {
    return { status: 'error', fullText: job.fullText, workoutUpdated: job.workoutUpdated, error: STALE_JOB_MESSAGE, phase: undefined, quickReplies: undefined };
  }
  const active = job.status === 'pending' || job.status === 'streaming';
  return {
    status: job.status, fullText: job.fullText, workoutUpdated: job.workoutUpdated, error: job.error,
    phase: active ? job.phase : undefined,
    quickReplies: job.status === 'done' ? job.quickReplies : undefined,
  };
}

export type JobRunDecision = 'skip' | 'run' | 'abort';

/**
 * Política ante la (re)entrega de un mensaje de la cola:
 * - job inexistente, 'done' o 'error' -> 'skip' (ack): ya está resuelto, no se repite nada.
 * - job en curso SIN progreso (WorkoutUpdated = 0 y sin texto) -> 'run': nada se aplicó, es seguro empezar de nuevo.
 * - job en curso CON progreso -> 'abort': ya se ejecutaron herramientas (se marca WorkoutUpdated al empezar
 *   cada una) o se emitió texto; repetir podría duplicar series o memorias, así que se marca 'error' en vez de reintentar.
 */
export function decideJobRun(job: Pick<ChatJob, 'status' | 'fullText' | 'workoutUpdated'> | undefined): JobRunDecision {
  if (!job || job.status === 'done' || job.status === 'error') return 'skip';
  if (!job.workoutUpdated && job.fullText.trim() === '') return 'run';
  return 'abort';
}

export function rowToJob(row: any): ChatJob {
  return {
    id: row.id,
    status: row.Status,
    fullText: row.FullText ?? '',
    workoutUpdated: !!row.WorkoutUpdated,
    error: row.Error ?? undefined,
    userId: row.UserId,
    createdAt: row.CreatedAt,
    requestId: row.RequestId ?? undefined,
    phase: row.Phase ?? undefined,
    updatedAt: row.UpdatedAt ?? undefined,
    quickReplies: parseQuickReplies(row.QuickReplies),
  };
}

// ---- Acceso a D1 (fino) ----

/**
 * Crea el job o devuelve el existente con el mismo requestId y usuario.
 * `created` es false si ya existía (no hay que lanzar otro procesamiento).
 */
export async function createOrGetJob(db: D1Database, userId: number, requestId?: string): Promise<{ id: string; created: boolean }> {
  const now = Date.now();
  // Limpieza oportunista de jobs antiguos
  await db.prepare('DELETE FROM ChatJobs WHERE CreatedAt < ?').bind(now - JOB_TTL_MS).run();

  if (requestId) {
    const existing = await db.prepare('SELECT id FROM ChatJobs WHERE UserId = ? AND RequestId = ?')
      .bind(userId, requestId).first<{ id: string }>();
    if (existing) return { id: existing.id, created: false };
  }

  const id = crypto.randomUUID();
  const res = await db.prepare(
    `INSERT OR IGNORE INTO ChatJobs (id, UserId, Status, FullText, WorkoutUpdated, CreatedAt, RequestId, Phase, UpdatedAt)
     VALUES (?, ?, 'pending', '', 0, ?, ?, ?, ?)`
  ).bind(id, userId, now, requestId ?? null, PHASE_THINKING, now).run();

  if (requestId && !res.meta?.changes) {
    // Carrera: otra petición con el mismo requestId insertó primero
    const winner = await db.prepare('SELECT id FROM ChatJobs WHERE UserId = ? AND RequestId = ?')
      .bind(userId, requestId).first<{ id: string }>();
    if (winner) return { id: winner.id, created: false };
  }
  return { id, created: true };
}

export async function getJob(db: D1Database, id: string, userId: number): Promise<ChatJob | undefined> {
  const row = await db.prepare('SELECT * FROM ChatJobs WHERE id = ? AND UserId = ?').bind(id, userId).first();
  return row ? rowToJob(row) : undefined;
}

/** Vuelca el texto acumulado (solo si el job sigue en curso). También marca la fase y la actividad. */
export async function updateJobText(db: D1Database, id: string, fullText: string) {
  await db.prepare(`UPDATE ChatJobs SET Status = 'streaming', FullText = ?, Phase = ?, UpdatedAt = ? WHERE id = ? AND Status IN ('pending', 'streaming')`)
    .bind(fullText, PHASE_WRITING, Date.now(), id).run();
}

/**
 * Cambia la fase visible (solo si el job sigue en curso). Con `toolStarted` marca además
 * WorkoutUpdated = 1 antes de ejecutar la herramienta: así una reentrega de la cola sabe que hubo efectos.
 */
export async function setJobPhase(db: D1Database, id: string, phase: string, toolStarted = false) {
  await db.prepare(`UPDATE ChatJobs SET Phase = ?, UpdatedAt = ?, WorkoutUpdated = CASE WHEN ? = 1 THEN 1 ELSE WorkoutUpdated END WHERE id = ? AND Status IN ('pending', 'streaming')`)
    .bind(phase, Date.now(), toolStarted ? 1 : 0, id).run();
}

export async function finishJob(db: D1Database, id: string, workoutUpdated: boolean, finalText?: string, quickReplies?: string[]) {
  // Texto final de la respuesta (el job acumula el texto de todos los turnos del bucle de herramientas)
  if (finalText !== undefined) {
    await db.prepare(`UPDATE ChatJobs SET Status = 'done', Phase = NULL, UpdatedAt = ?, WorkoutUpdated = ?, FullText = ?, QuickReplies = ? WHERE id = ?`)
      .bind(Date.now(), workoutUpdated ? 1 : 0, finalText, quickReplies?.length ? JSON.stringify(quickReplies) : null, id).run();
  } else {
    await db.prepare(`UPDATE ChatJobs SET Status = 'done', Phase = NULL, UpdatedAt = ?, WorkoutUpdated = ? WHERE id = ?`)
      .bind(Date.now(), workoutUpdated ? 1 : 0, id).run();
  }
}

export async function failJob(db: D1Database, id: string, error: string, workoutUpdated = false) {
  await db.prepare(`UPDATE ChatJobs SET Status = 'error', Phase = NULL, UpdatedAt = ?, Error = ?, WorkoutUpdated = ? WHERE id = ?`)
    .bind(Date.now(), error, workoutUpdated ? 1 : 0, id).run();
}

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
}

const JOB_TTL_MS = 3600000;
const FLUSH_INTERVAL_MS = 1000;
const MAX_REQUEST_ID_LENGTH = 100;

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
    `INSERT OR IGNORE INTO ChatJobs (id, UserId, Status, FullText, WorkoutUpdated, CreatedAt, RequestId)
     VALUES (?, ?, 'pending', '', 0, ?, ?)`
  ).bind(id, userId, now, requestId ?? null).run();

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

/** Vuelca el texto acumulado (solo si el job sigue en curso). */
export async function updateJobText(db: D1Database, id: string, fullText: string) {
  await db.prepare(`UPDATE ChatJobs SET Status = 'streaming', FullText = ? WHERE id = ? AND Status IN ('pending', 'streaming')`)
    .bind(fullText, id).run();
}

export async function finishJob(db: D1Database, id: string, workoutUpdated: boolean, finalText?: string) {
  // Texto final de la respuesta (el job acumula el texto de todos los turnos del bucle de herramientas)
  if (finalText !== undefined) {
    await db.prepare(`UPDATE ChatJobs SET Status = 'done', WorkoutUpdated = ?, FullText = ? WHERE id = ?`)
      .bind(workoutUpdated ? 1 : 0, finalText, id).run();
  } else {
    await db.prepare(`UPDATE ChatJobs SET Status = 'done', WorkoutUpdated = ? WHERE id = ?`)
      .bind(workoutUpdated ? 1 : 0, id).run();
  }
}

export async function failJob(db: D1Database, id: string, error: string, workoutUpdated = false) {
  await db.prepare(`UPDATE ChatJobs SET Status = 'error', Error = ?, WorkoutUpdated = ? WHERE id = ?`)
    .bind(error, workoutUpdated ? 1 : 0, id).run();
}

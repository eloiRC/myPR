// Memoria persistente del entrenador IA: acceso a D1 (fino) + render del prompt (puro).

export const MEMORY_KINDS = ['lesion', 'objetivo', 'preferencia', 'nota'] as const;
export const MEMORY_STATUSES = ['activa', 'resuelta'] as const;
export type MemoryKind = typeof MEMORY_KINDS[number];
export type MemoryStatus = typeof MEMORY_STATUSES[number];

export interface MemoryRow {
  MemoryId: number;
  UserId: number;
  Kind: MemoryKind;
  Text: string;
  Status: MemoryStatus;
  CreatedAt: number; // unix seconds
  UpdatedAt: number;
}

export const MAX_ACTIVE_MEMORIES_IN_PROMPT = 40;
export const MAX_MEMORY_TEXT = 500;
/** Una lesión activa más antigua que esto debe revisarse antes de programar */
export const INJURY_REVIEW_DAYS = 3;

const DAY = 86400;

const isoDate = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);

/** Bloque "MEMORIA DEL USUARIO" para el contexto volátil. Solo recibe memorias activas. */
export function renderMemoryBlock(memories: MemoryRow[], nowSec: number): string {
  const header = 'MEMORIA DEL USUARIO';
  if (memories.length === 0) {
    return `${header}\nSin memorias guardadas todavía.`;
  }
  const lines = memories.slice(0, MAX_ACTIVE_MEMORIES_IN_PROMPT).map(m => {
    const ageDays = Math.max(0, Math.floor((nowSec - m.CreatedAt) / DAY));
    const review = m.Kind === 'lesion' && ageDays > INJURY_REVIEW_DAYS ? ` [REVISAR: lesión activa desde hace ${ageDays} días, pregunta cómo evoluciona]` : '';
    return `- [id ${m.MemoryId}] (${m.Kind}, ${isoDate(m.CreatedAt)}) ${m.Text}${review}`;
  });
  return `${header}\n${lines.join('\n')}`;
}

export async function listActiveMemories(db: D1Database, userId: number, limit = MAX_ACTIVE_MEMORIES_IN_PROMPT): Promise<MemoryRow[]> {
  const { results } = await db.prepare(
    `SELECT * FROM CoachMemory WHERE UserId = ? AND Status = 'activa' ORDER BY CreatedAt DESC, MemoryId DESC LIMIT ?`
  ).bind(userId, limit).all();
  return (results || []) as unknown as MemoryRow[];
}

export async function listAllMemories(db: D1Database, userId: number): Promise<MemoryRow[]> {
  const { results } = await db.prepare(
    `SELECT * FROM CoachMemory WHERE UserId = ? ORDER BY CASE Status WHEN 'activa' THEN 0 ELSE 1 END, UpdatedAt DESC, MemoryId DESC`
  ).bind(userId).all();
  return (results || []) as unknown as MemoryRow[];
}

export async function insertMemory(db: D1Database, userId: number, kind: MemoryKind, text: string): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const res = await db.prepare(
    `INSERT INTO CoachMemory (UserId, Kind, Text, Status, CreatedAt, UpdatedAt) VALUES (?, ?, ?, 'activa', ?, ?)`
  ).bind(userId, kind, text, now, now).run();
  return Number(res.meta.last_row_id);
}

/** Actualiza texto y/o estado. Devuelve false si la memoria no existe o no es del usuario. */
export async function updateMemory(db: D1Database, userId: number, id: number, patch: { text?: string; status?: MemoryStatus }): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const res = await db.prepare(
    `UPDATE CoachMemory SET Text = COALESCE(?, Text), Status = COALESCE(?, Status), UpdatedAt = ? WHERE MemoryId = ? AND UserId = ?`
  ).bind(patch.text ?? null, patch.status ?? null, now, id, userId).run();
  return (res.meta.changes ?? 0) > 0;
}

export async function deleteMemory(db: D1Database, userId: number, id: number): Promise<boolean> {
  const res = await db.prepare('DELETE FROM CoachMemory WHERE MemoryId = ? AND UserId = ?').bind(id, userId).run();
  return (res.meta.changes ?? 0) > 0;
}

-- Migration: memoria persistente del entrenador IA (por usuario)
CREATE TABLE IF NOT EXISTS CoachMemory (
    MemoryId INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    Kind TEXT NOT NULL,
    Text TEXT NOT NULL,
    Status TEXT NOT NULL DEFAULT 'activa',
    CreatedAt INTEGER NOT NULL,
    UpdatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coachmemory_user_status ON CoachMemory (UserId, Status);

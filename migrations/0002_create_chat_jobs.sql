-- Migration: Jobs del chat del coach (antes en memoria, invisibles entre isolates)
CREATE TABLE IF NOT EXISTS ChatJobs (
    id TEXT PRIMARY KEY,
    UserId INTEGER NOT NULL,
    Status TEXT NOT NULL DEFAULT 'pending',
    FullText TEXT NOT NULL DEFAULT '',
    WorkoutUpdated INTEGER NOT NULL DEFAULT 0,
    Error TEXT DEFAULT NULL,
    CreatedAt INTEGER NOT NULL,
    RequestId TEXT DEFAULT NULL
);

-- Idempotencia: un mismo requestId por usuario solo puede crear un job
CREATE UNIQUE INDEX IF NOT EXISTS idx_chatjobs_user_request
    ON ChatJobs (UserId, RequestId) WHERE RequestId IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chatjobs_created ON ChatJobs (CreatedAt);

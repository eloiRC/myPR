-- Migration: fase visible del job del coach (Pensando…, Escribiendo…, herramienta) y marca de última actividad
ALTER TABLE ChatJobs ADD COLUMN Phase TEXT DEFAULT NULL;
ALTER TABLE ChatJobs ADD COLUMN UpdatedAt INTEGER DEFAULT NULL;
-- Respuestas rápidas sugeridas por el coach (suggest_replies): array JSON de textos
ALTER TABLE ChatJobs ADD COLUMN QuickReplies TEXT DEFAULT NULL;

-- Sin índice sobre UpdatedAt: la caducidad se evalúa por job (consulta por id) y la limpieza usa CreatedAt (idx_chatjobs_created)

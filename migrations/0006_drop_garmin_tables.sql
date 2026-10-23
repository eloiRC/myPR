-- Migration: eliminar las tablas de la integración con Garmin (retirada de la app).
-- Estaban vacías en producción al borrarlas (2026-10-23).
DROP TABLE IF EXISTS GarminCredentials;
DROP TABLE IF EXISTS DailyRecovery;
DROP TABLE IF EXISTS CardioActivity;

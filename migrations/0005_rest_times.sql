-- Tiempos de descanso: ajustes del temporizador por usuario + descanso por serie y por ejercicio.
-- Jerarquía al marcar una serie como hecha: Series.DescansoSeg > Exercici.DescansoSeg > Users.RestTimerDefaultSec.
-- Rango válido 15-900 s (se valida en zod, no en SQL).
ALTER TABLE Users ADD COLUMN RestTimerEnabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Users ADD COLUMN RestTimerDefaultSec INTEGER NOT NULL DEFAULT 90;
ALTER TABLE Users ADD COLUMN RestTimerAutoStart INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Series ADD COLUMN DescansoSeg INTEGER DEFAULT NULL;
ALTER TABLE Exercici ADD COLUMN DescansoSeg INTEGER DEFAULT NULL;

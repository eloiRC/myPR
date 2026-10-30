-- Ejercicios archivados (p. ej. al cambiar de gimnasio): se ocultan de las listas y del coach,
-- pero su historial (series y entrenos) se conserva. 0 = activo, 1 = archivado.
ALTER TABLE Exercici ADD COLUMN Archivat INTEGER NOT NULL DEFAULT 0;

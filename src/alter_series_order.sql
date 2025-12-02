-- Añadir columna de orden a la tabla Series y migrar valores iniciales
ALTER TABLE Series ADD COLUMN Orden INTEGER;

-- Inicializar el orden con el identificador actual para preservar el orden existente
UPDATE Series SET Orden = SerieId;


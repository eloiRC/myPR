-- Modelo del entrenador IA elegido por cada usuario (NULL = el predeterminado del entorno)
ALTER TABLE Users ADD COLUMN LlmModel TEXT;

-- Velocidad medida por modelo (se acumula en cada respuesta del entrenador)
CREATE TABLE IF NOT EXISTS LlmStats (
  Model TEXT PRIMARY KEY,
  Jobs INTEGER NOT NULL DEFAULT 0,
  TtftMsSum INTEGER NOT NULL DEFAULT 0,
  SpeedSum REAL NOT NULL DEFAULT 0,
  SpeedN INTEGER NOT NULL DEFAULT 0
);

-- Migration: el campo "Personalizar el entrenador IA" (Users.ChatbotPrompt) desaparece de la app.
-- Su contenido pasa a la memoria del entrenador como preferencia activa, para no perder nada.
-- La columna se conserva (sin uso) por seguridad.
INSERT INTO CoachMemory (UserId, Kind, Text, Status, CreatedAt, UpdatedAt)
SELECT UserId, 'preferencia', substr(trim(ChatbotPrompt), 1, 500), 'activa', CAST(strftime('%s', 'now') AS INTEGER), CAST(strftime('%s', 'now') AS INTEGER)
FROM Users
WHERE ChatbotPrompt IS NOT NULL AND length(trim(ChatbotPrompt)) >= 3
  AND NOT EXISTS (
    SELECT 1 FROM CoachMemory m
    WHERE m.UserId = Users.UserId AND m.Text = substr(trim(Users.ChatbotPrompt), 1, 500)
  );

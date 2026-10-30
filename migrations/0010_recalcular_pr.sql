-- Corrige en origen los récords desfasados: Exercici.PR = máximo de kg de sus series (0 si no hay)
-- y PR=1 solo en las series con ese máximo. Es idempotente: se puede volver a ejecutar.
UPDATE Exercici SET PR = COALESCE((SELECT MAX(S.Kg) FROM Series S WHERE S.ExerciciId = Exercici.ExerciciId AND S.UserId = Exercici.UserId), 0);
UPDATE Series SET PR = CASE
  WHEN Kg > 0 AND Kg = (SELECT MAX(S2.Kg) FROM Series S2 WHERE S2.ExerciciId = Series.ExerciciId AND S2.UserId = Series.UserId) THEN 1
  ELSE 0
END;

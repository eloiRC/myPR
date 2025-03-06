UPDATE Series
SET PR = TRUE
WHERE (ExerciciId, Kg) IN (
    SELECT ExerciciId, MAX(Kg) 
    FROM Series 
    GROUP BY ExerciciId
);
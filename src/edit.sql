-- hitorial de entreno de un usuario 
SELECT
    -- Seleccionamos el ID del entreno para agrupar las series.
    T1.EntrenoId,

    -- Seleccionamos la fecha del entreno.
    -- NOTA: Esta consulta asume que la columna 'Data' almacena un timestamp de Unix.
    -- Si la fecha se guarda en otro formato, la función DATE() podría devolver NULL o un valor incorrecto.
    DATE(T1.Data, 'unixepoch') AS FechaEntreno,

    -- Seleccionamos el nombre del ejercicio.
    -- Si un entreno no tiene series, este campo aparecerá como NULL.
    T3.Nom AS NombreEjercicio,

    -- Seleccionamos los datos de la serie.
    -- Si un entreno no tiene series, estos campos aparecerán como NULL.
    T2.Kg,
    T2.Reps
FROM
    -- Empezamos desde la tabla de Entreno.
    Entreno AS T1
LEFT JOIN
    -- Usamos LEFT JOIN para asegurarnos de que se listen todos los entrenos de un usuario,
    -- incluso si no tienen series registradas. Esto es útil para depurar.
    Series AS T2 ON T1.EntrenoId = T2.EntrenoId
LEFT JOIN
    -- Unimos con la tabla Exercici. La unión también es LEFT por consistencia.
    Exercici AS T3 ON T2.ExerciciId = T3.ExerciciId
WHERE
    -- Filtramos para obtener solo los resultados de un usuario específico.
    -- IMPORTANTE: Asegúrate de reemplazar '?' con un UserId que exista en tu tabla 'Users'.
    -- Por ejemplo: T1.UserId = 1
    T1.UserId = 13
ORDER BY
    -- Ordenamos los resultados por fecha y luego por entreno para mantener las series juntas.
    FechaEntreno DESC,
    T1.EntrenoId,
    T2.SerieId ASC;

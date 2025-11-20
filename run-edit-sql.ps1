# Script para ejecutar la consulta SQL y guardar el resultado
$query = "SELECT T1.EntrenoId, DATE(T1.Data, 'unixepoch') AS FechaEntreno, T3.Nom AS NombreEjercicio, T2.Kg, T2.Reps FROM Entreno AS T1 LEFT JOIN Series AS T2 ON T1.EntrenoId = T2.EntrenoId LEFT JOIN Exercici AS T3 ON T2.ExerciciId = T3.ExerciciId WHERE T1.UserId = 13 ORDER BY FechaEntreno DESC, T1.EntrenoId, T2.SerieId ASC;"

& wrangler d1 execute mypr --local --command=$query | Out-File -FilePath edit_result.txt -Encoding utf8

Write-Host "Resultado guardado en edit_result.txt" -ForegroundColor Green


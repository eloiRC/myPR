-- Primero eliminamos la referencia en la tabla Series
DROP TABLE IF EXISTS Series;

-- Eliminamos la tabla Entreno
DROP TABLE IF EXISTS Entreno;

-- Creamos la tabla Entreno con todas sus columnas
CREATE TABLE Entreno (
    EntrenoId INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    Data INTEGER,
    CargaTotal INTEGER,
    Nom TEXT,
    Descripcio TEXT DEFAULT '',
    Puntuacio INTEGER DEFAULT NULL CHECK (Puntuacio >= 1 AND Puntuacio <= 5),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

-- Creamos la tabla Series de nuevo con la referencia a Entreno
CREATE TABLE Series (
    SerieId INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER,
    EntrenoId INTEGER,
    ExerciciId INTEGER,
    Kg INTEGER,
    Reps INTEGER,
    Data INTEGER,
    Carga INTEGER,
    PR BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (EntrenoId) REFERENCES Entreno(EntrenoId),
    FOREIGN KEY (ExerciciId) REFERENCES Exercici(ExerciciId)
);

-- Añadir las columnas a la tabla Entreno
ALTER TABLE Entreno ADD COLUMN Nom TEXT;
ALTER TABLE Entreno ADD COLUMN Descripcio TEXT DEFAULT '';
ALTER TABLE Entreno ADD COLUMN Puntuacio INTEGER DEFAULT NULL CHECK (Puntuacio >= 1 AND Puntuacio <= 5);

-- Actualizar los nombres de los entrenos existentes
UPDATE Entreno 
SET Nom = 'Entreno #' || (
    SELECT COUNT(*) + 1 
    FROM Entreno e2 
    WHERE e2.UserId = Entreno.UserId 
    AND e2.EntrenoId <= Entreno.EntrenoId
); 
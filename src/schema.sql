DROP TABLE IF EXISTS Users;
CREATE TABLE IF NOT EXISTS Users (UserId INTEGER PRIMARY KEY AUTOINCREMENT, Email TEXT UNIQUE, Password TEXT);
INSERT INTO Users ( Email, Password) VALUES ('eloirebollo97@gmail.com', $(test_password)), ('eloirebollo@gmail.com', 'Thomas Hardy');

DROP TABLE IF EXISTS Exercici;
CREATE TABLE IF NOT EXISTS Exercici (ExerciciId INTEGER PRIMARY KEY AUTOINCREMENT, Nom TEXT,UserId INTEGER, PR INTEGER,GrupMuscular1 INTEGER,GrupMuscular2 INTEGER,GrupMuscular3 INTEGER,GrupMuscular4 INTEGER,GrupMuscular5 INTEGER);
INSERT INTO Exercici ( Nom ,UserId , PR ,GrupMuscular1 ,GrupMuscular2 ,GrupMuscular3 ,GrupMuscular4 ,GrupMuscular5 ) VALUES ( "Press Banca" ,1 , 0 ,1 ,null ,null ,null ,null);

DROP TABLE IF EXISTS Entreno;
CREATE TABLE IF NOT EXISTS Entreno (EntrenoId INTEGER PRIMARY KEY AUTOINCREMENT, UserId INTEGER,Data INTEGER, CargaTotal INTEGER);
INSERT INTO Entreno (EntrenoId,UserId,Data,CargaTotal ) VALUES (1,1,null,null);

-- Añadir las nuevas columnas a la tabla Entreno
ALTER TABLE Entreno ADD COLUMN Nom TEXT;
ALTER TABLE Entreno ADD COLUMN Descripcio TEXT;
ALTER TABLE Entreno ADD COLUMN Puntuacio INTEGER CHECK (Puntuacio >= 1 AND Puntuacio <= 5);

-- Actualizar los registros existentes con valores por defecto
UPDATE Entreno SET Nom = 'Entreno #1', Descripcio = '', Puntuacio = 3 WHERE EntrenoId = 1;

DROP TABLE IF EXISTS GrupMuscular;
CREATE TABLE IF NOT EXISTS GrupMuscular (GrupMuscularId INTEGER PRIMARY KEY AUTOINCREMENT, Nom TEXT UNIQUE);
INSERT INTO GrupMuscular (Nom) VALUES ( "Pectoral"),("Hombros"),("Biceps"),("Triceps"),("Dorsals"),("Trapezi"),("Core"),("Gltuis"),("Quadriceps"),("Lumbars"),("Femoral"),("Bessons");

DROP TABLE IF EXISTS Series;
CREATE TABLE Series (
    SerieId INTEGER PRIMARY KEY AUTOINCREMENT, 
    UserId INTEGER,
    ExerciciId INTEGER,
    Kg INTEGER,
    Reps INTEGER,
    Data INTEGER, 
    Carga INTEGER,
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (ExerciciId) REFERENCES Exercici(ExerciciId)
);
INSERT INTO Series (UserId,ExerciciId,Kg,Reps,Data,Carga) VALUES
    (1,1,10,10,1765849,100);
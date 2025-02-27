PRAGMA defer_foreign_keys = on;


-- Primero creamos las tablas padre antes de las tablas que las referencian
-- Tabla Users
DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
    UserId INTEGER PRIMARY KEY AUTOINCREMENT, 
    Email TEXT UNIQUE, 
    Password TEXT
);

-- Tabla GrupMuscular
DROP TABLE IF EXISTS GrupMuscular;
CREATE TABLE GrupMuscular (
    GrupMuscularId INTEGER PRIMARY KEY AUTOINCREMENT, 
    Nom TEXT UNIQUE
);

-- Ahora las tablas con referencias
-- Tabla Exercici
DROP TABLE IF EXISTS Exercici;
CREATE TABLE Exercici (
    ExerciciId INTEGER PRIMARY KEY AUTOINCREMENT, 
    Nom TEXT,
    UserId INTEGER,
    PR INTEGER DEFAULT 0,
    GrupMuscular1 INTEGER,
    GrupMuscular2 INTEGER,
    GrupMuscular3 INTEGER,
    GrupMuscular4 INTEGER,
    GrupMuscular5 INTEGER,
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (GrupMuscular1) REFERENCES GrupMuscular(GrupMuscularId),
    FOREIGN KEY (GrupMuscular2) REFERENCES GrupMuscular(GrupMuscularId),
    FOREIGN KEY (GrupMuscular3) REFERENCES GrupMuscular(GrupMuscularId),
    FOREIGN KEY (GrupMuscular4) REFERENCES GrupMuscular(GrupMuscularId),
    FOREIGN KEY (GrupMuscular5) REFERENCES GrupMuscular(GrupMuscularId)
);

-- Tabla Entreno
DROP TABLE IF EXISTS Entreno;
CREATE TABLE Entreno (
    EntrenoId INTEGER PRIMARY KEY AUTOINCREMENT, 
    UserId INTEGER,
    Data INTEGER, 
    CargaTotal INTEGER,
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

-- Tabla Series
DROP TABLE IF EXISTS Series;
CREATE TABLE Series (
    SerieId INTEGER PRIMARY KEY AUTOINCREMENT, 
    UserId INTEGER,
    EntrenoId INTEGER,
    ExerciciId INTEGER,
    Kg INTEGER,
    Reps INTEGER,
    Data INTEGER, 
    Carga INTEGER,
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (EntrenoId) REFERENCES Entreno(EntrenoId),
    FOREIGN KEY (ExerciciId) REFERENCES Exercici(ExerciciId)
);

-- Inserta datos en las tablas padre primero
INSERT INTO Users (Email, Password) VALUES 
    ('eloirebollo97@gmail.com', 'elo12597'), 
    ('eloirebollo@gmail.com', 'Thomas Hardy');

INSERT INTO GrupMuscular (Nom) VALUES 
    ('Pectoral'),('Hombros'),('Biceps'),('Triceps'),('Dorsals'),
    ('Trapezi'),('Core'),('Gltuis'),('Quadriceps'),('Lumbars'),
    ('Femoral'),('Bessons');

-- Ahora inserta en las tablas que tienen referencias
INSERT INTO Exercici (Nom, UserId, PR, GrupMuscular1) VALUES 
    ('Press Banca', 1, 0, 1);

INSERT INTO Entreno (UserId, Data, CargaTotal) VALUES 
    (1, 0, 0);

INSERT INTO Series (UserId,EntrenoId,ExerciciId,Kg,Reps,Data,Carga) VALUES
    (1,1,1,10,10,1765849,100);
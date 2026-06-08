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
    Nom TEXT,
    Descripcio TEXT,
    Puntuacio INTEGER CHECK (Puntuacio >= 1 AND Puntuacio <= 5),
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
    PR BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    FOREIGN KEY (EntrenoId) REFERENCES Entreno(EntrenoId),
    FOREIGN KEY (ExerciciId) REFERENCES Exercici(ExerciciId)
);

-- Inserta datos en las tablas padre primero
INSERT INTO Users (Email, Password) VALUES 
    ('eloirebollo97@gmail.com', 'elo12597'), 
    ('eloirebollo@gmail.com', 'Thomas Hardy'),
    ('eloirebollodp@gmail.com', 'qcDOAuHY6szdy6HAD1S7sqOraZ156zHHWXbLUGjPMFqZjKPRIqAaz9pG3I2JvFiJ');

INSERT INTO GrupMuscular (Nom) VALUES 
    ('Pectoral'),('Hombros'),('Biceps'),('Triceps'),('Dorsals'),
    ('Trapezi'),('Core'),('Gltuis'),('Quadriceps'),('Lumbars'),
    ('Femoral'),('Bessons'),('Abductors'),('Deltoides');

-- Ahora inserta en las tablas que tienen referencias
INSERT INTO Exercici (Nom, UserId, PR, GrupMuscular1) VALUES 
    ('Press Banca', 1, 0, 1);

INSERT INTO Entreno (UserId, Data, CargaTotal, Nom, Descripcio, Puntuacio) VALUES 
    (1, 0, 0, 'Entreno 1', 'Descripción del entreno 1', 3);

-- Tabla de credenciales Garmin (una por usuario)
DROP TABLE IF EXISTS GarminCredentials;
CREATE TABLE GarminCredentials (
    UserId INTEGER PRIMARY KEY,
    GarminEmail TEXT NOT NULL,
    GarminPasswordEncrypted TEXT NOT NULL,
    LastSync INTEGER DEFAULT NULL,
    Activo INTEGER DEFAULT 1,
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

-- Tabla de métricas diarias de recuperación
DROP TABLE IF EXISTS DailyRecovery;
CREATE TABLE DailyRecovery (
    RecoveryId INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    Data INTEGER NOT NULL,
    SleepHores REAL DEFAULT NULL,
    SleepScore INTEGER DEFAULT NULL,
    SleepDeep REAL DEFAULT NULL,
    SleepLight REAL DEFAULT NULL,
    SleepREM REAL DEFAULT NULL,
    HRV REAL DEFAULT NULL,
    HRVLastNight REAL DEFAULT NULL,
    RecoveryHours REAL DEFAULT NULL,
    RestingHR INTEGER DEFAULT NULL,
    Passos INTEGER DEFAULT NULL,
    Stress INTEGER DEFAULT NULL,
    BodyBattery INTEGER DEFAULT NULL,
    BodyBatteryDrained INTEGER DEFAULT NULL,
    TrainingReadiness INTEGER DEFAULT NULL,
    Calories INTEGER DEFAULT NULL,
    ActiveCalories INTEGER DEFAULT NULL,
    IntensityMinutes INTEGER DEFAULT NULL,
    MaxHR INTEGER DEFAULT NULL,
    MinHR INTEGER DEFAULT NULL,
    VO2Max REAL DEFAULT NULL,
    RespirationRate REAL DEFAULT NULL,
    SpO2 REAL DEFAULT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(UserId),
    UNIQUE(UserId, Data)
);

-- Tabla de actividades cardio (ciclismo, running, trail, etc.)
DROP TABLE IF EXISTS CardioActivity;
CREATE TABLE CardioActivity (
    ActivityId INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId INTEGER NOT NULL,
    GarminActivityId TEXT NOT NULL UNIQUE,
    Data INTEGER NOT NULL,
    Tipus TEXT NOT NULL,
    Nom TEXT DEFAULT NULL,
    Distancia REAL DEFAULT NULL,
    Durada INTEGER DEFAULT NULL,
    AvgHR INTEGER DEFAULT NULL,
    MaxHR INTEGER DEFAULT NULL,
    AvgSpeed REAL DEFAULT NULL,
    MaxSpeed REAL DEFAULT NULL,
    DesnivelPos REAL DEFAULT NULL,
    DesnivelNeg REAL DEFAULT NULL,
    MinElevation REAL DEFAULT NULL,
    MaxElevation REAL DEFAULT NULL,
    TSS INTEGER DEFAULT NULL,
    Esforc REAL DEFAULT NULL,
    AnaerobicEsforc REAL DEFAULT NULL,
    Calories INTEGER DEFAULT NULL,
    AvgPower REAL DEFAULT NULL,
    MaxPower REAL DEFAULT NULL,
    VO2MaxValue REAL DEFAULT NULL,
    AvgCadence REAL DEFAULT NULL,
    AvgStrideLength REAL DEFAULT NULL,
    Importat INTEGER DEFAULT 1,
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

INSERT INTO Series (UserId,EntrenoId,ExerciciId,Kg,Reps,Data,Carga) VALUES
    (1,1,1,10,10,1765849,100);
PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE Users (
    UserId INTEGER PRIMARY KEY AUTOINCREMENT, 
    Email TEXT UNIQUE, 
    Password TEXT
);
INSERT INTO Users VALUES(1,'eloirebollo97@gmail.com','elo12597');
INSERT INTO Users VALUES(2,'eloirebollo@gmail.com','Thomas Hardy');
INSERT INTO Users VALUES(4,'eloirebollodp@gmail.com','Yk2KSNAZ6XLnIAPF6zxB0RTKfigAEoZLY9ww4UNAMbo3z93SHwDNSc4Cmo06mLyH');
INSERT INTO Users VALUES(6,'eloirebollo1@gmail.com','vJcKgmXsXq9xmvVxtiPqQZSXYgGcMk+TSIUyAStF0li/4FnV9c0FCX7Rdrs41ft1');
INSERT INTO Users VALUES(7,'eloirebollo2@gmail.com','xwjLh3W5eYhA6Gnuj8Z9LyB6UFlxZSXKxrKlSb+7VeilXsC49r7e9hqrRlk2GpRS');
INSERT INTO Users VALUES(8,'eloirebollodp6@gmail.com','/0IbDQsNrXhWuSLPstpSpyBSHIfh/8VJXvrkQR7mr+J9V68b5BXeWgkYQQ+1+Qvb');
INSERT INTO Users VALUES(9,'eloirebollodp7@gmail.com','c8pPHGB2LvLWGkLd6eUSujt8ricnVM38+iWoj4j9g8XT6dwY0vnPxDTiaCk66KIH');
INSERT INTO Users VALUES(10,'eloirebollo7@gmail.com','VnTkCnP3IMxNJ2FmNe0chl5k5mngvbtnZJz0qLvaWHkm2DWJuuBjqQp5nloehiLX');
INSERT INTO Users VALUES(11,'eloirebollo8@gmail.com','Z71ELZOPUMWk41w3OzpTZF0lkZ6mLFY/fZLVwpOv8AEtBxhj59imYJx4VcyRiSiK');
INSERT INTO Users VALUES(12,'eloirebollod10@gmail.com','8dP1J5G7WD/pkYb8P13Bmymeb4poc8Nwwzb7xslEmjrLRDUkEx4hqFVPlq4mA1Ob');
INSERT INTO Users VALUES(13,'eloi@gmail.com','Lp3YDLcX+9sgDPyw12l0JenaGZtMBs7CiAn0WgHdob1RIjPupxV8lGWyDdLt0NBh');
INSERT INTO Users VALUES(14,'email@email.com','D/aaH2t1YrPmHQS7ZgENFP7JwFkk8UIOlPcpP5uNsVHBeRBIiDPAk2h9qMa1TSBu');
CREATE TABLE GrupMuscular (
    GrupMuscularId INTEGER PRIMARY KEY AUTOINCREMENT, 
    Nom TEXT UNIQUE
);
INSERT INTO GrupMuscular VALUES(1,'Pectoral');
INSERT INTO GrupMuscular VALUES(2,'Hombros');
INSERT INTO GrupMuscular VALUES(3,'Biceps');
INSERT INTO GrupMuscular VALUES(4,'Triceps');
INSERT INTO GrupMuscular VALUES(5,'Dorsals');
INSERT INTO GrupMuscular VALUES(6,'Trapezi');
INSERT INTO GrupMuscular VALUES(7,'Core');
INSERT INTO GrupMuscular VALUES(8,'Gltuis');
INSERT INTO GrupMuscular VALUES(9,'Quadriceps');
INSERT INTO GrupMuscular VALUES(10,'Lumbars');
INSERT INTO GrupMuscular VALUES(11,'Femoral');
INSERT INTO GrupMuscular VALUES(12,'Bessons');
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
INSERT INTO Exercici VALUES(1,'Press Banca',1,0,1,NULL,NULL,NULL,NULL);
INSERT INTO Exercici VALUES(2,'Flexions',13,57,1,2,4,NULL,NULL);
INSERT INTO Exercici VALUES(3,'Dominades',13,79,3,5,NULL,NULL,NULL);
INSERT INTO Exercici VALUES(4,'Muscle Up ',13,0,2,3,4,5,6);
INSERT INTO Exercici VALUES(5,'Enpinar El Codo',14,20,2,NULL,NULL,NULL,NULL);
INSERT INTO Exercici VALUES(6,'Pechote En Barra',14,50,1,NULL,NULL,NULL,NULL);
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
INSERT INTO Entreno VALUES(1,1,0,0,'Entreno 1','Descripción del entreno 1',3);
INSERT INTO Entreno VALUES(2,4,1741046033,0,'Entreno #1','',3);
INSERT INTO Entreno VALUES(3,13,1741047173,1803,'primer entreno','',3);
INSERT INTO Entreno VALUES(4,14,1741106196,100,'Alex entrena ','',3);
INSERT INTO Entreno VALUES(5,14,1741106505,100,'Entreno #2','',3);
INSERT INTO Entreno VALUES(6,14,1741106579,250,'Entreno chill','Entreno chill en el parke',5);
INSERT INTO Entreno VALUES(7,14,1741106722,0,'Entreno #4','',3);
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
INSERT INTO Series VALUES(1,1,1,1,10,10,1765849,100,0);
INSERT INTO Series VALUES(2,13,3,2,57,15,1741047599,855,1);
INSERT INTO Series VALUES(3,13,3,3,79,12,1741048343,948,1);
INSERT INTO Series VALUES(4,14,4,5,5,20,1741106238,100,1);
INSERT INTO Series VALUES(5,14,5,5,20,5,1741106521,100,1);
INSERT INTO Series VALUES(6,14,6,6,50,3,1741106631,150,1);
INSERT INTO Series VALUES(7,14,6,5,10,10,1741106656,100,0);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('Users',14);
INSERT INTO sqlite_sequence VALUES('GrupMuscular',12);
INSERT INTO sqlite_sequence VALUES('Exercici',6);
INSERT INTO sqlite_sequence VALUES('Entreno',7);
INSERT INTO sqlite_sequence VALUES('Series',7);

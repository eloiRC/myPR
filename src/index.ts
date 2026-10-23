import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { nouExercici, petition, getEntrenos, novaSerie, getEntreno, editSerie, signup, login, deleteSerie, editExercici, getGrupsMusculars, getExercici, getPesosHistorial, nouEntreno, editEntreno, getCargaHistorial, chatGPT, getUser, deleteEntreno, reorderSerie, toggleSerieCompletada, chatStatus, memoryList, memoryCreate, memoryUpdate, memoryDelete } from './schema'
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from './jwt'
import { createProvider, formatUsage } from './llm'
import { runToolLoop } from './llm/loop'
import { convertHistory } from './llm/history'
import { executeTool, TOOL_DEFS, type ToolContext } from './coachTools'
import { COACH_PERSONA, buildVolatileContext } from './coachPrompt'
import { listActiveMemories, listAllMemories, insertMemory, updateMemory as updateCoachMemory, deleteMemory as deleteCoachMemory } from './coachMemory'
import { createOrGetJob, getJob, updateJobText, finishJob, failJob, normalizeRequestId, shouldFlush } from './chatJobs'
import { analyzeTraining, type HistoryRow, type ExerciseRow } from './coachAnalysis'



type Bindings = {
  DB: D1Database;
  test_password: string;
  jwt_secret: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  LLM_PROVIDER: string;
  LLM_MODEL?: string;
}

const app = new Hono<{ Bindings: Bindings; Variables: { jwtPayload: any } }>()

app.use(logger())

// Configurar CORS
app.use('*', cors({
  origin: ['http://localhost:5175', 'https://myprfr.pages.dev'], // URL del frontend local y de Cloudflare Pages
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))


app.use('/api/*', async (c, next) => {
  let token: string | null = null;

  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else {
    try {
      const body = await c.req.json();
      if (body?.token) token = body.token;
    } catch { }
  }

  if (!token) return c.text('invalid token', 401);

  try {
    const decodedPayload = await verifyJWT(token, c.env.jwt_secret);
    c.set('jwtPayload', decodedPayload)
    await next()
  } catch (error) {
    return c.text('invalid token', 401)
  }
})

// Función auxiliar para añadir series (Refactorizada para usar en API y en las herramientas del coach)
async function addSerieToDb(c: any, userId: number, entrenoId: number, exerciciId: number, kg: number, reps: number) {
  const data = Math.floor(Date.now() / 1000)
  const carga = kg * reps

  // Reset all PR flags for this exercise (harmless if no PR changed)
  const updatePrStmt = c.env.DB.prepare('UPDATE Exercici SET PR=? WHERE UserId=? AND ExerciciId=? AND ? > PR')
    .bind(kg, userId, exerciciId, kg);
  const resetPrStmt = c.env.DB.prepare('UPDATE Series SET PR=0 WHERE UserId=? AND ExerciciId=?')
    .bind(userId, exerciciId);
  const maxOrdenStmt = c.env.DB.prepare('SELECT COALESCE(MAX(Orden), 0) + 1 AS newOrden FROM Series WHERE UserId=? AND EntrenoId=?')
    .bind(userId, entrenoId);

  const [prResult, , ordenResult] = await c.env.DB.batch([updatePrStmt, resetPrStmt, maxOrdenStmt]);

  const prUpdated = (prResult.meta?.rows_written ?? 0) > 0;
  const newOrden = Number((ordenResult.results?.[0] as any)?.newOrden || 1);

  const insertStmt = c.env.DB.prepare(
    'INSERT INTO Series (UserId,EntrenoId,ExerciciId,Kg,Reps,Carga,PR,Completada,Data,Orden) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING SerieId'
  ).bind(userId, entrenoId, exerciciId, kg, reps, carga, prUpdated ? 1 : 0, 0, data, newOrden);

  const updateCargaStmt = c.env.DB.prepare(
    'UPDATE Entreno SET CargaTotal=CargaTotal+? WHERE UserId=? AND EntrenoId=? RETURNING CargaTotal'
  ).bind(carga, userId, entrenoId);

  const [insertResult, cargaResult] = await c.env.DB.batch([insertStmt, updateCargaStmt]);

  return {
    serieId: (insertResult.results?.[0] as any)?.SerieId ?? 0,
    newPr: prUpdated,
    cargaTotal: (cargaResult.results?.[0] as any)?.CargaTotal ?? 0
  }
}

//crear un exercisi nou, requerim nom y grup muscular(id del grup)
app.post('/api/nouExercici', zValidator('json', nouExercici), async (c) => {
  const { nom, grupsMusculars } = await c.req.json();

  const [GM1, GM2, GM3, GM4, GM5] = grupsMusculars

  try {
    const result = await c.env.DB.prepare('INSERT INTO Exercici (Nom, UserId, PR, GrupMuscular1, GrupMuscular2, GrupMuscular3, GrupMuscular4, GrupMuscular5) VALUES (?, ?, 0, ?, ?, ?, ?, ?);').bind(nom, await c.get('jwtPayload').UserId, GM1 || null, GM2 || null, GM3 || null, GM4 || null, GM5 || null).run()
    return c.json({ message: 'exercici creat', exerciciId: result.meta.last_row_id })

  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

app.post('/api/editExercici', zValidator('json', editExercici), async (c) => {
  const { exerciciId, nom, grupsMusculars } = await c.req.json()


  const [GM1, GM2, GM3, GM4, GM5] = grupsMusculars

  try {
    const result = await c.env.DB.prepare('UPDATE Exercici SET Nom=?, GrupMuscular1=?, GrupMuscular2=?, GrupMuscular3=?, GrupMuscular4=?, GrupMuscular5=? WHERE ExerciciId=? AND UserId=?').bind(nom, GM1 || null, GM2 || null, GM3 || null, GM4 || null, GM5 || null, exerciciId, await c.get('jwtPayload').UserId).run()
    return c.json({ message: 'exercici actualitzat' })
  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

//creem un entreno nou l'entrem a la DB retoem OK, Id de l'entereno i data de creacio
app.post('/api/nouEntreno', async (c) => {
  const data = Math.floor(Date.now() / 1000)
  const userId = await c.get('jwtPayload').UserId

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO Entreno (UserId, Data, CargaTotal, Nom, Descripcio, Puntuacio)
       SELECT ?, ?, 0,
         'Entreno #' || (COALESCE(MAX(CAST(SUBSTR(Nom, 10) AS INTEGER)), 0) + 1),
         '', 3
       FROM Entreno WHERE UserId = ? AND Nom LIKE 'Entreno #%'`
    ).bind(userId, data, userId).run();

    return c.json({ message: 'Nou Entreno Creat', entrenoId: result.meta.last_row_id, dataInici: data })
  } catch (error) {
    console.error('nouEntreno error:', error)
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

//crea nova serie i comprova si es un nou PR iactualitza la carga total
app.post('/api/novaSerie', zValidator('json', novaSerie), async (c, next) => {
  const { entrenoId, exerciciId, kg, reps } = await c.req.json()
  const userId = await c.get('jwtPayload').UserId

  try {
    const result = await addSerieToDb(c, userId, entrenoId, exerciciId, kg, reps);
    return c.json({
      message: 'Serie Guardada',
      serieId: result.serieId,
      newPr: result.newPr,
      cargaTotal: result.cargaTotal
    })
  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

//edit serie nou pes i reps
app.post('/api/editSerie', zValidator('json', editSerie), async (c) => {
  const { exerciciId, kg, reps, serieId, entrenoId } = await c.req.json()
  const carga = kg * reps
  const userId = await c.get('jwtPayload').UserId
  let newPr = false

  try {
    //actualitzem la serie
    const updateSerie = await c.env.DB.prepare('UPDATE Series SET ExerciciId=?,Kg=?,Reps=?,Carga=? WHERE UserID=? AND SerieId=?  RETURNING *').bind(exerciciId, kg, reps, carga, userId, serieId).run()

    //actualitzem el pr
    const updatePr = await checkPr(c, userId, exerciciId, kg)
    if (updatePr.serieId == serieId) {
      newPr = true
    }

    //actualitzem la carga total de l'entreno
    const updateCT = await updateCargaTotal(c, userId, entrenoId)


    return c.json({ message: 'Serie Actualitzada', serieId: updateSerie.results[0].SerieId, newPr: newPr, cargaTotal: updateCT.results[0].CargaTotal })

  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

//toggle serie completada
app.post('/api/toggleSerieCompletada', zValidator('json', toggleSerieCompletada), async (c) => {
  const { serieId, completada } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;
  try {
    const result = await c.env.DB.prepare(
      'UPDATE Series SET Completada=? WHERE SerieId=? AND UserId=? RETURNING Completada'
    ).bind(completada ? 1 : 0, serieId, userId).run();
    if (!result.results || result.results.length === 0) {
      throw new HTTPException(404, { message: 'Serie no encontrada' });
    }
    return c.json({ message: 'Serie actualizada', completada: (result.results[0] as any).Completada === 1 });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('toggleSerieCompletada error:', error);
    throw new HTTPException(500, { message: 'error sql query' });
  }
})

//delete serie
app.post('/api/deleteSerie', zValidator('json', deleteSerie), async (c) => {
  const { serieId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId

  try {
    const result = await c.env.DB.prepare('SELECT * FROM Series WHERE SerieId=? AND UserId=?').bind(serieId, userId).run()
    const resultD = await c.env.DB.prepare('DELETE FROM Series WHERE SerieId=? AND UserId = ?').bind(serieId, userId).run()
    //recalcular el pr

    if (result.results.length != 0) {
      const updatePr = await checkPr(c, userId, result.results[0].ExerciciId, 0)
      //reclacular carga
      const updateCT = await updateCargaTotal(c, userId, result.results[0].EntrenoId)
      return c.json({ message: 'Serie Borrada', cargaTotal: updateCT.results[0].CargaTotal })
    }
    else {
      return c.json({ message: 'Serie NO Borrada' })
    }

  } catch (error) {
    console.error(error)
    throw new HTTPException(500, { message: 'error sql query' })
  }

})

// eliminar un entreno completo del usuario (primero borra sus series)
app.post('/api/deleteEntreno', zValidator('json', deleteEntreno), async (c) => {
  const { entrenoId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId

  try {
    // Borrar todas las series asociadas a este entreno para el usuario
    await c.env.DB.prepare('DELETE FROM Series WHERE EntrenoId=? AND UserId=?').bind(entrenoId, userId).run()

    // Borrar el entreno
    const result = await c.env.DB.prepare('DELETE FROM Entreno WHERE EntrenoId=? AND UserId=?').bind(entrenoId, userId).run()

    if (result.meta.rows_written && result.meta.rows_written > 0) {
      return c.json({ message: 'Entreno Borrado', entrenoId })
    } else {
      return c.json({ message: 'Entreno NO Borrado' }, 404)
    }
  } catch (error) {
    console.error(error)
    throw new HTTPException(500, { message: 'error sql query' })
  }
})


//retorna tots els entrtenos entre dos dates d'un usuari
app.post('/api/getEntrenos', zValidator('json', getEntrenos), async (c) => {
  const { dataInici, dataFi } = await c.req.json()

  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM Entreno WHERE UserId=? AND Data > ? AND Data < ?').bind(c.get('jwtPayload').UserId, dataInici, dataFi).all()
    return c.json(results)
  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })

  }

})

// Descargar historial completo de entrenos del usuario
app.post('/api/downloadHistorial', zValidator('json', petition), async (c) => {
  const userId = await c.get('jwtPayload').UserId;

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        T1.EntrenoId,
        DATE(T1.Data, 'unixepoch') AS FechaEntreno,
        T3.Nom AS NombreEjercicio,
        T2.Kg,
        T2.Reps
      FROM
        Entreno AS T1
      LEFT JOIN
        Series AS T2 ON T1.EntrenoId = T2.EntrenoId
      LEFT JOIN
        Exercici AS T3 ON T2.ExerciciId = T3.ExerciciId
      WHERE
        T1.UserId = ?
      ORDER BY
        FechaEntreno DESC,
        T1.EntrenoId,
        T2.SerieId ASC
    `).bind(userId).all();

    return c.json(results);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    throw new HTTPException(500, { message: 'error sql query' });
  }
});

//retona dades de l'entreno + series 
app.post('/api/getEntreno', zValidator('json', getEntreno), async (c) => {
  const { entrenoId } = await c.req.json()
  const userId = await c.get('jwtPayload').UserId

  try {
    const resultsE = await c.env.DB.prepare('SELECT * FROM Entreno WHERE EntrenoId=? AND UserId=?').bind(entrenoId, userId).all();
    const resultsS = await c.env.DB.prepare('SELECT * FROM Series WHERE EntrenoId = ? AND UserId=? ORDER BY Orden ASC, SerieId ASC').bind(entrenoId, userId).all();

    return c.json({ entreno: resultsE.results, series: resultsS.results })
  } catch (error) {
    console.error(error)
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

// Reordenar una serie dentro de un entreno
app.post('/api/reorderSerie', zValidator('json', reorderSerie), async (c) => {
  const { entrenoId, serieId, newIndex } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    const current = await c.env.DB
      .prepare('SELECT SerieId, Orden FROM Series WHERE EntrenoId=? AND UserId=? ORDER BY Orden ASC, SerieId ASC')
      .bind(entrenoId, userId)
      .all();

    const list = current.results || [];
    if (list.length === 0) return c.json({ message: 'no series' });

    const ids = list.map((s: any) => s.SerieId);
    const fromIdx = ids.indexOf(serieId);
    if (fromIdx === -1) throw new HTTPException(404, { message: 'serie not found' });

    const toIdx = Math.min(Math.max(newIndex, 0), ids.length - 1);
    if (toIdx === fromIdx) return c.json({ message: 'no change' });

    const reordered = [...ids];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    for (let i = 0; i < reordered.length; i++) {
      await c.env.DB
        .prepare('UPDATE Series SET Orden=? WHERE SerieId=? AND UserId=? AND EntrenoId=?')
        .bind(i + 1, reordered[i], userId, entrenoId)
        .run();
    }

    return c.json({ message: 'reordered', orden: reordered.map((id, i) => ({ serieId: id, orden: i + 1 })) });
  } catch (error) {
    console.error(error)
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

//retorna la llista d'exercicis
app.post('/api/getExercicis', zValidator('json', petition), async (c) => {//retorna tots els exercisi de la taula d'aquest usuari

  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM EXERCICI WHERE UserId=? ORDER BY Nom ASC').bind(c.get('jwtPayload').UserId).all();
    return c.json(results)
  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })

  }

})

//retorna la llista de grupos musculares
app.post('/api/getGrupsMusculars', zValidator('json', getGrupsMusculars), async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM GrupMuscular ORDER BY Nom').all();
    return c.json(results)
  } catch (error) {
    console.error(error)
    throw new HTTPException(500, { message: 'Error al obtener grupos musculares' })
  }
})

// Obtener detalles de un ejercicio
app.post('/api/getExercici', zValidator('json', getExercici), async (c) => {
  const { exerciciId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    const exercici = await c.env.DB.prepare('SELECT * FROM Exercici WHERE ExerciciId = ? AND UserId = ?').bind(exerciciId, userId).first();
    if (!exercici) throw new HTTPException(404, { message: 'Ejercicio no encontrado' });

    const entrenoPr = await c.env.DB.prepare(
      `SELECT E.* FROM Entreno E
       INNER JOIN Series S ON S.EntrenoId = E.EntrenoId
       WHERE S.ExerciciId = ? AND S.PR = 1 AND S.UserId = ? AND E.UserId = ?
       ORDER BY E.Data DESC LIMIT 1`
    ).bind(exerciciId, userId, userId).first();

    return c.json({ ...exercici, entrenoPr: entrenoPr ?? null });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Error al obtener el ejercicio:', error);
    throw new HTTPException(500, { message: 'Error al obtener el ejercicio' });
  }
});


// Obtener historial de pesos de un ejercicio
app.post('/api/getPesosHistorial', zValidator('json', getPesosHistorial), async (c) => {
  const { exerciciId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    const results = await c.env.DB.prepare(`
      SELECT e.Data, MAX(s.Kg) as PesoMaximo
      FROM Entreno e
      JOIN Series s ON e.EntrenoId = s.EntrenoId
      WHERE s.ExerciciId = ? AND e.UserId = ?
      GROUP BY e.EntrenoId
      ORDER BY e.Data DESC
    `).bind(exerciciId, userId).all();

    return c.json(results.results);
  } catch (error) {
    throw new HTTPException(500, { message: 'Error al obtener el historial de pesos' });
  }
});

// Obtener historial de carga de un ejercicio
app.post('/api/getCargaHistorial', zValidator('json', getCargaHistorial), async (c) => {
  const { exerciciId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    const results = await c.env.DB.prepare(`
      SELECT 
        e.Data,
        COALESCE(SUM(s.Kg * s.Reps), 0) as CargaTotal
      FROM Entreno e
      JOIN Series s ON e.EntrenoId = s.EntrenoId
      WHERE s.ExerciciId = ? AND e.UserId = ?
      GROUP BY e.Data, e.EntrenoId
      ORDER BY e.Data DESC
    `).bind(exerciciId, userId).all();

    return c.json(results.results);
  } catch (error) {
    console.error('Error al obtener el historial de carga:', error);
    throw new HTTPException(500, { message: 'Error al obtener el historial de carga' });
  }
});

// Editar un entrenamiento
app.post('/api/editEntreno', zValidator('json', editEntreno), async (c) => {
  const { entrenoId, nom, descripcio, puntuacio } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    // Verificar que el entrenamiento existe y pertenece al usuario
    const checkEntreno = await c.env.DB.prepare('SELECT * FROM Entreno WHERE EntrenoId = ? AND UserId = ?')
      .bind(entrenoId, userId)
      .all();

    if (checkEntreno.results.length === 0) {
      throw new HTTPException(404, { message: 'Entrenamiento no encontrado' });
    }

    // Actualizar el entrenamiento
    const result = await c.env.DB.prepare(`
      UPDATE Entreno 
      SET Nom = COALESCE(?, Nom),
          Descripcio = ?,
          Puntuacio = ?
      WHERE EntrenoId = ? AND UserId = ?
    `).bind(nom ?? null, descripcio || '', puntuacio ?? null, entrenoId, userId).run();

    if (result.meta.rows_written === 0) {
      throw new HTTPException(500, { message: 'Error al actualizar el entrenamiento' });
    }

    // Obtener el entrenamiento actualizado para devolverlo
    const updatedEntreno = await c.env.DB.prepare('SELECT * FROM Entreno WHERE EntrenoId = ? AND UserId = ?')
      .bind(entrenoId, userId)
      .all();

    return c.json({
      message: 'Entrenamiento actualizado correctamente',
      entreno: updatedEntreno.results[0]
    });
  } catch (error) {
    console.error('Error al actualizar el entrenamiento:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error al actualizar el entrenamiento' });
  }
});



//new user
app.post('/signup', zValidator('json', signup), async (c) => {
  const { email, password } = await c.req.json()

  try {
    // Encriptar la contraseña antes de guardarla
    const hashedPassword = await hashPassword(password);

    const { results } = await c.env.DB.prepare('INSERT INTO Users (Email,Password) VALUES (?,?) RETURNING *').bind(email, hashedPassword).run()
    //const token = await generateJWT({ email: email, UserId: Number(results[0].UserId), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, c.env.jwt_secret)


    const token = await generateJWT({ email: email, UserId: Number(results[0].UserId), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, c.env.jwt_secret)

    return c.json({ message: 'signup succesfull', token: token })
  } catch (error: any) {

    if (error.message == "D1_ERROR: UNIQUE constraint failed: Users.Email: SQLITE_CONSTRAINT") {

      return c.text('este email ya esta registrado', 500)
    }
    throw new HTTPException(500, { message: 'error sql query' })
  }

})

app.post('/login', zValidator('json', login), async (c) => {
  const { email, password } = await c.req.json();

  try {
    // Buscar usuario en la DB y obtener la contraseña encriptada
    const { results } = await c.env.DB.prepare('SELECT * FROM Users WHERE Email=?').bind(email).run();

    if (results.length === 0) {
      return c.text('invalid credentials', 401)
    }

    // Verificar la contraseña
    const isPasswordValid = await verifyPassword(results[0].Password as string, password);

    if (isPasswordValid) {
      console.log("log in succesfull")

      const token = await generateJWT({ email: email, UserId: Number(results[0].UserId), exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, c.env.jwt_secret)
      // Create a token


      //retornem el jwt token al client
      return c.json({ message: 'authorized', token: token })

    }
    else {
      return c.text('invalid credentials', 401)
    }
  } catch (error) {
    const message = "error " + error
    throw new HTTPException(500, { message: message })
  }


})

app.post('/api/getUser', zValidator('json', getUser), async (c) => {
  const userId = await c.get('jwtPayload').UserId;
  try {
    const user = await c.env.DB.prepare('SELECT Email, UserId FROM Users WHERE UserId = ?').bind(userId).first();
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }
    return c.json(user);
  } catch (error) {
    throw new HTTPException(500, { message: 'Error fetching user' });
  }
});



// ---- Memoria del entrenador IA (JWT, siempre filtrada por usuario) ----

app.post('/api/memory/list', zValidator('json', memoryList), async (c) => {
  const userId = await c.get('jwtPayload').UserId;
  try {
    return c.json(await listAllMemories(c.env.DB, userId));
  } catch (error) {
    console.error('memory/list error:', error);
    throw new HTTPException(500, { message: 'error sql query' });
  }
});

// Alta manual desde Ajustes (la IA usa la herramienta save_memory)
app.post('/api/memory/create', zValidator('json', memoryCreate), async (c) => {
  const { kind, text } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;
  try {
    const memoryId = await insertMemory(c.env.DB, userId, kind, text);
    return c.json({ memoryId });
  } catch (error) {
    console.error('memory/create error:', error);
    throw new HTTPException(500, { message: 'error sql query' });
  }
});

app.post('/api/memory/update', zValidator('json', memoryUpdate), async (c) => {
  const { memoryId, kind, text, status } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;
  try {
    const done = await updateCoachMemory(c.env.DB, userId, memoryId, { text, status, kind });
    if (!done) throw new HTTPException(404, { message: 'Memoria no encontrada' });
    return c.json({ message: 'Memoria actualizada' });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('memory/update error:', error);
    throw new HTTPException(500, { message: 'error sql query' });
  }
});

app.post('/api/memory/delete', zValidator('json', memoryDelete), async (c) => {
  const { memoryId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;
  try {
    const done = await deleteCoachMemory(c.env.DB, userId, memoryId);
    if (!done) throw new HTTPException(404, { message: 'Memoria no encontrada' });
    return c.json({ message: 'Memoria borrada' });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('memory/delete error:', error);
    throw new HTTPException(500, { message: 'error sql query' });
  }
});

// Endpoint del coach IA (long-polling). /api/gemini se mantiene como alias para clientes antiguos en caché.
const coachHandler = async (c: any) => {
  const { message, currentTraining, history, requestId: rawRequestId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;
  const requestId = normalizeRequestId(rawRequestId);
  // Idempotente: un reintento con el mismo requestId devuelve el job existente
  const { id: jobId, created } = await createOrGetJob(c.env.DB, userId, requestId);

  if (created) {
    c.executionCtx.waitUntil(procesarChatJob(jobId, userId, message, currentTraining, history, c));
  }
  return c.json({ jobId });
};
app.post('/api/coach', zValidator('json', chatGPT), coachHandler);
app.post('/api/gemini', zValidator('json', chatGPT), coachHandler);

async function procesarChatJob(jobId: string, userId: number, message: string, currentTraining: any, history: unknown, c: any) {
  // Si falla a mitad, se registra si ya se aplicó algo para que el front refresque
  const state = { workoutUpdated: false };
  try {
    // Falla pronto (y en español) si falta la clave del proveedor seleccionado
    const provider = createProvider(c.env);

    const entrenoId = Number(currentTraining.entreno.EntrenoId);
    const [entreno, coachData, seriesCurrentTraining, memories] = await Promise.all([
      c.env.DB.prepare('SELECT EntrenoId, Nom FROM Entreno WHERE EntrenoId = ? AND UserId = ?').bind(entrenoId, userId).first(),
      getCoachData(userId, entrenoId, c),
      getFullSeriesListFromTraining(entrenoId, userId, c),
      listActiveMemories(c.env.DB, userId),
    ]);
    if (!entreno) throw new Error('Entreno no encontrado');

    const analysis = analyzeTraining(coachData);
    const nowSec = Math.floor(Date.now() / 1000);

    const volatile = buildVolatileContext({
      dateLabel: new Date().toLocaleDateString('es-ES'),
      nowSec,
      entreno: { EntrenoId: entrenoId, Nom: entreno.Nom || '' },
      seriesToday: seriesCurrentTraining,
      memories,
      muscleGroups: coachData.muscleGroups,
      analysisText: analysis.text,
    });

    const toolCtx: ToolContext = {
      db: c.env.DB,
      userId,
      entrenoId,
      validExerciseIds: analysis.validExerciseIds,
      validMuscleGroupIds: new Set(coachData.muscleGroups.map(g => g.GrupMuscularId)),
      state,
      deps: {
        addSerie: (exerciciId, kg, reps) => addSerieToDb(c, userId, entrenoId, exerciciId, kg, reps),
        checkPr: (exerciciId, kg) => checkPr(c, userId, exerciciId, kg),
        updateCargaTotal: (id) => updateCargaTotal(c, userId, id),
      },
    };

    // Texto en streaming hacia D1 con throttle (no en cada delta)
    let fullText = '';
    let lastFlush = 0;
    let flushedLength = 0;
    let flushing: Promise<void> = Promise.resolve();
    const onText = (delta: string) => {
      fullText += delta;
      const now = Date.now();
      if (shouldFlush(now, lastFlush, fullText.length - flushedLength)) {
        lastFlush = now;
        flushedLength = fullText.length;
        const snapshot = fullText;
        flushing = flushing.then(() => updateJobText(c.env.DB, jobId, snapshot)).catch(e => console.error('flush error:', e));
      }
    };

    const result = await runToolLoop({
      provider,
      input: {
        system: { stable: COACH_PERSONA, volatile },
        messages: [...convertHistory(history), { role: 'user', text: message }],
        tools: TOOL_DEFS,
        maxTokens: 8000,
      },
      exec: call => executeTool(toolCtx, call.name, call.args),
      onText,
    });
    await flushing;

    console.log(formatUsage(provider.name, provider.model, result.usage), `iterations=${result.iterations} stop=${result.stopReason}`);

    let finalText = result.text.trim();
    if (!finalText) finalText = state.workoutUpdated ? 'Hecho.' : 'No he podido generar una respuesta. Inténtalo de nuevo.';
    await finishJob(c.env.DB, jobId, state.workoutUpdated, finalText);

  } catch (error: any) {
    console.error('❌ Error coach IA:', error);
    try {
      await failJob(c.env.DB, jobId, error.message || 'Error desconocido', state.workoutUpdated);
    } catch (e) {
      console.error('No se pudo marcar el job como fallido:', e);
    }
  }
}

// Chat job status (polling)
app.post('/api/chatStatus', zValidator('json', chatStatus), async (c) => {
  const { jobId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;
  const job = await getJob(c.env.DB, jobId, userId);
  if (!job) throw new HTTPException(404, { message: 'Job no encontrado' });
  return c.json({
    status: job.status,
    fullText: job.fullText,
    workoutUpdated: job.workoutUpdated,
    error: job.error
  });
});

app.onError((err, c) => {
  console.error(`❌ Error capturado: `, err);

  // Manejar errores de validación de Zod
  if (err.message && err.message.includes('Invalid')) {
    console.error('❌ Error de validación:', err.message);
    return c.json({
      error: true,
      message: 'Los datos enviados no son válidos. Por favor, verifica que todos los campos estén correctos.',
      details: err.message
    }, 400);
  }

  if (err.message == "error sql query") {
    return c.text('error sql query', 500)
  }

  return c.json({
    error: true,
    message: err.message || 'Error desconocido'
  }, 500)
})



export default app

async function checkPr(c: any, userId: any, exerciciId: any, kg: any) {
  try {
    const updatePr = c.env.DB.prepare('UPDATE Exercici SET PR=(SELECT MAX(Kg) FROM Series WHERE ExerciciId=?) WHERE UserId=? AND ExerciciId=? AND PR!=? RETURNING PR')
      .bind(exerciciId, userId, exerciciId, kg);
    const resetPr = c.env.DB.prepare('UPDATE Series SET PR=0 WHERE UserId=? AND ExerciciId=?')
      .bind(userId, exerciciId);
    const setNewPr = c.env.DB.prepare('UPDATE Series SET PR=1 WHERE UserId=? AND ExerciciId=? AND Kg=(SELECT MAX(Kg) FROM Series WHERE ExerciciId=?) RETURNING SerieId')
      .bind(userId, exerciciId, exerciciId);

    const [prResult, , setResult] = await c.env.DB.batch([updatePr, resetPr, setNewPr]);

    if ((prResult.meta?.rows_written ?? 0) > 0) {
      return {
        prUpdated: true,
        newPR: (prResult.results?.[0] as any)?.PR ?? false,
        serieId: (setResult.results?.[0] as any)?.SerieId ?? 0
      };
    }
    return { prUpdated: false, newPR: false };

  } catch (error) {
    console.error(error)
    throw new HTTPException(500, { message: 'error sql query' })
  }
}

function updateCargaTotal(c: any, userId: any, entrenoId: any) {

  try {
    const updateCarga = c.env.DB.prepare('UPDATE Entreno SET CargaTotal=(SELECT SUM(Carga) From Series WHERE EntrenoId=?) WHERE UserId=? AND EntrenoId=?  RETURNING *').bind(entrenoId, userId, entrenoId).run()

    return updateCarga

  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }


}

// Datos crudos para el análisis del coach (ver coachAnalysis.ts)
async function getCoachData(userId: number, currentEntrenoId: number, c: any) {
  // Últimos 40 entrenos (excluyendo el actual, que va aparte); limitamos por entreno, no por filas
  const historyStmt = c.env.DB.prepare(`
    SELECT E.EntrenoId, E.Nom, E.Data, S.ExerciciId, Ex.Nom AS NomExercici, S.Kg, S.Reps
    FROM Entreno E
    JOIN Series S ON E.EntrenoId = S.EntrenoId AND S.UserId = E.UserId
    LEFT JOIN Exercici Ex ON S.ExerciciId = Ex.ExerciciId
    WHERE E.EntrenoId IN (
      SELECT EntrenoId FROM Entreno WHERE UserId = ? AND EntrenoId != ? ORDER BY Data DESC LIMIT 40
    )
    ORDER BY E.Data DESC, S.Orden ASC, S.SerieId ASC
  `).bind(userId, currentEntrenoId);
  const exercisesStmt = c.env.DB.prepare(
    'SELECT ExerciciId, Nom, PR, GrupMuscular1, GrupMuscular2, GrupMuscular3, GrupMuscular4, GrupMuscular5 FROM Exercici WHERE UserId = ? ORDER BY Nom ASC'
  ).bind(userId);
  const groupsStmt = c.env.DB.prepare('SELECT GrupMuscularId, Nom FROM GrupMuscular');

  const [history, exercises, groups] = await c.env.DB.batch([historyStmt, exercisesStmt, groupsStmt]);

  return {
    rows: (history.results || []) as HistoryRow[],
    exercises: (exercises.results || []) as ExerciseRow[],
    muscleGroups: (groups.results || []) as { GrupMuscularId: number; Nom: string }[],
  };
}


async function getFullSeriesListFromTraining(EntrenoId: any, userId: any, c: any) {
  try {
    const { results } = await c.env.DB.prepare(`
SELECT
Series.SerieId,
  Series.EntrenoId,
  Series.ExerciciId,
  Exercici.Nom AS NomExercici,
    Series.Kg,
    Series.Reps,
    Series.Data,
    Series.Carga,
    Series.PR,
    Series.Completada
FROM
Series
JOIN 
    Exercici ON Series.ExerciciId = Exercici.ExerciciId
WHERE
Series.EntrenoId = ? AND Series.UserId = ?;
`).bind(EntrenoId, userId).all();



    return JSON.stringify(results)
  } catch (error) {
    console.error("Error retrieving full history:", error);
    // You might want to throw a specific error or return an empty string/array
    return JSON.stringify([]); // Return empty array on error
  }
}

import { Context, Hono } from 'hono'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { nouExercici, petition, getEntrenos, novaSerie, getEntreno, editSerie, signup, login, deleteSerie, editExercici, getGrupsMusculars, getExercici, getPesosHistorial, nouEntreno, editEntreno, getCargaHistorial, chatGPT, updateUser, getUser, deleteEntreno, reorderSerie } from './schema'
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from './jwt'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { startsWith } from 'zod/v4'


type Bindings = {
  DB: D1Database;
  test_password: string;
  jwt_secret: string;
  GEMINI_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

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
  const { token } = await c.req.json();
  // console.log(token)
  try {
    const decodedPayload = await verifyJWT(token, c.env.jwt_secret);

    c.set('jwtPayload', decodedPayload)
    // console.log(c.get('jwtPayload'))
    await next()

  } catch (error) {
    return c.text('invalid token', 401)
  }
})

// Función auxiliar para añadir series (Refactorizada para usar en API y Gemini)
async function addSerieToDb(c: any, userId: number, entrenoId: number, exerciciId: number, kg: number, reps: number) {
  const data = Math.floor(Date.now() / 1000)
  const carga = kg * reps
  let prUpdated = false

  // Comprobar si es PR
  const updatePr = await c.env.DB.prepare('UPDATE Exercici SET PR=? WHERE UserID=? AND ExerciciId=? AND ? > PR ').bind(kg, userId, exerciciId, kg).run()

  if (updatePr.meta.rows_written > 0) {
    prUpdated = true;
    // Resetear flags de PR anteriores en series de este ejercicio
    await c.env.DB.prepare('UPDATE Series SET PR=FALSE WHERE UserID=? AND ExerciciId=? AND PR=TRUE ').bind(userId, exerciciId).run()
  }

  // Calcular el nuevo orden al final del entreno
  const maxOrder = await c.env.DB.prepare('SELECT COALESCE(MAX(Orden), 0) as maxOrden FROM Series WHERE UserId=? AND EntrenoId=?')
    .bind(userId, entrenoId).all();
  const newOrden = Number(maxOrder.results?.[0]?.maxOrden || 0) + 1;

  // Insertar la nueva serie
  const result = await c.env.DB.prepare('INSERT INTO Series (UserId,EntrenoId,ExerciciId,Kg,Reps,Carga,PR,Data,Orden) VALUES (?,?,?,?,?,?,?,?,?) RETURNING *').bind(userId, entrenoId, exerciciId, kg, reps, carga, prUpdated, data, newOrden).run()

  // Actualizar carga total del entreno
  const updateCarga = await c.env.DB.prepare('UPDATE Entreno SET CargaTotal=CargaTotal+? WHERE UserID=? AND EntrenoId=?  RETURNING *').bind(carga, userId, entrenoId).run()

  return {
    serieId: result.results[0].SerieId,
    newPr: prUpdated,
    cargaTotal: updateCarga.results[0].CargaTotal
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
    // Obtener el número total de entrenos del usuario
    const { results } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM Entreno WHERE UserId = ?').bind(userId).all();
    const numeroEntreno = Number(results[0].total || 0) + 1;

    const result = await c.env.DB.prepare('INSERT INTO Entreno (UserId, Data, CargaTotal, Nom, Descripcio, Puntuacio) VALUES (?, ?, ?, ?, ?, ?);')
      .bind(userId, data, 0, `Entreno #${numeroEntreno}`, '', 3)
      .run();

    return c.json({ message: 'Nou Entreno Creat', entrenoId: result.meta.last_row_id, dataInici: data })
  } catch (error) {
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
      return c.json({ mesage: 'Serie Borrada', cargaTotal: updateCT.results[0].CargaTotal })
    }
    else {
      return c.json({ mesage: 'Serie NO Borrada' })
    }

  } catch (error) {
    console.log(error)
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
    console.log(error)
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
    console.log(error)
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
    console.log(error)
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
    const { results } = await c.env.DB.prepare('SELECT * FROM GrupMuscular').all();
    return c.json(results)
  } catch (error) {
    console.log(error)
    throw new HTTPException(500, { message: 'Error al obtener grupos musculares' })
  }
})

// Obtener detalles de un ejercicio
app.post('/api/getExercici', zValidator('json', getExercici), async (c) => {
  const { exerciciId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    const exercici = await c.env.DB.prepare('SELECT * FROM Exercici WHERE ExerciciId = ? AND UserId = ?').bind(exerciciId, userId).all();
    //retorna l'entreno la serie amb l'exercici te le pr 
    const entrenoPr = await c.env.DB.prepare('SELECT * FROM Entreno WHERE (EntrenoId) IN (SELECT EntrenoId FROM Series WHERE ExerciciId=? AND PR=true ) AND UserId=?').bind(exerciciId, userId).all();
    let response = exercici.results[0]
    response.entrenoPr = entrenoPr.results[0]

    console.log(entrenoPr.results[0])
    if (exercici.results.length === 0 || entrenoPr.results.length === 0) {
      throw new HTTPException(404, { message: 'Ejercicio no encontrado' });
    }
    return c.json(response);
  } catch (error) {
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
      SET Nom = ?, 
          Descripcio = ?,
          Puntuacio = ?
      WHERE EntrenoId = ? AND UserId = ?
    `).bind(nom, descripcio || '', puntuacio || null, entrenoId, userId).run();

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
    //const token = await generateJWT({ email: email, UserId: results[0].UserId, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, c.env.jwt_secret)


    const token = await generateJWT({ email: email, UserId: results[0].UserId, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, c.env.jwt_secret)

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

      const token = await generateJWT({ email: email, UserId: results[0].UserId, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, c.env.jwt_secret)
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
    const user = await c.env.DB.prepare('SELECT Email, UserId, ChatbotPrompt FROM Users WHERE UserId = ?').bind(userId).first();
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }
    return c.json(user);
  } catch (error) {
    throw new HTTPException(500, { message: 'Error fetching user' });
  }
});

app.post('/api/updateUser', zValidator('json', updateUser), async (c) => {
  const { chatbotPrompt } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    await c.env.DB.prepare('UPDATE Users SET ChatbotPrompt = ? WHERE UserId = ?').bind(chatbotPrompt, userId).run();
    return c.json({ message: 'User updated successfully' });
  } catch (error) {
    throw new HTTPException(500, { message: 'Error updating user' });
  }
});


// Endpoint para Gemini (Streaming SSE)
app.post('/api/gemini', zValidator('json', chatGPT), async (c) => {
  const { message, currentTraining, history } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    // Ejecutar todas las queries DB en paralelo para reducir latencia
    const [userStats, seriesCurrentTraining, user] = await Promise.all([
      getUserStats(userId, c),
      getFullSeriesListFromTraining(currentTraining.entreno.EntrenoId, c),
      c.env.DB.prepare('SELECT ChatbotPrompt FROM Users WHERE UserId = ?').bind(userId).first()
    ]);

    const availableExercises = currentTraining.ejercicios || [];
    const exercisesListString = availableExercises.map((e: any) => `ID: ${e.ExerciciId} - Nombre: ${e.Nom}`).join('\n');
    const userCustomPrompt = user?.ChatbotPrompt ? `\n\nINSTRUCCIONES PERSONALIZADAS DEL USUARIO:\n${user.ChatbotPrompt}` : '';
    const trainingHistory = JSON.stringify(userStats.lastWorkouts);

    const basePersona = `
SYSTEM INSTRUCTIONS: EXPERT STRENGTH COACH

Eres un Coach de Élite especializado en Fuerza y Hipertrofia. Tu objetivo es actuar como un motor de análisis de rendimiento para el usuario. Eres directo, técnico y te enfocas exclusivamente en resultados y datos.

CONTEXTO DE ENTRADA

Recibirás:

Historial: Últimos 50 entrenamientos ${trainingHistory}.

PRs Actuales: ${JSON.stringify(userStats.prs)}.

Catálogo de Ejercicios: ${exercisesListString}.

PROTOCOLO DE ANÁLISIS (Interno)

Antes de generar la propuesta, evalúa bajo criterios de realismo técnico y los hallazgos del historial:

Filtro de Calidad de Datos (Anti-Ruido): Identifica y descarta series de aproximación (<40% del PR o <50% del peso máximo de la sesión anterior). Solo analiza "series de trabajo" para evitar falsos cálculos de volumen.

Criterio de Sobrecarga Progresiva:
- Si el usuario completó todas las reps en la última sesión: Propón un incremento de +1.25kg a +2.5kg (microcarga).
- Si detectas estancamiento (+3 sesiones con mismo peso/reps): Varía el rango de reps (ej. de 3x10 a 4x8) o propón un Drop Set o Rest-Pause para romper la adaptación.

Jerarquía y Volumen Basura:
- Prioriza ejercicios multiarticulares (Sentadilla, Banca, Peso Muerto).
- Si detectas más de 10 series efectivas por grupo muscular en una sesión, elimina accesorios redundantes para priorizar la intensidad en los básicos.

Análisis de Variedad Estratégica:
- ¿Lleva +3 semanas con el mismo ejercicio? Si hay estancamiento, cambia el ángulo (ej. Press Plano por Inclinado).
- ¿Músculos descuidados? Si un grupo no aparece en 2 semanas, incorpóralo.

REGLAS DE RESPUESTA (ESTRICTO)

FASE 1: PROPUESTA (Esperando confirmación)

Genera una respuesta visualmente limpia:

[Nombre del Grupo Muscular o Enfoque]

[Nombre Ejercicio]: [Series]x[Reps] | [Peso Sugerido]kg | RIR [X]

Contexto: [Comparativa directa: ej. "Subimos +2.5kg respecto al lunes" o "Nueva variante para romper estancamiento en banca"].

Pregunta Final: "¿Confirmas este plan para añadirlo a tu registro?"

FASE 2: EJECUCIÓN (Solo tras confirmación explícita)

Genera el bloque JSON al final de tu mensaje.

FORMATO JSON_PLAN

\`\`\`json_plan
[
  { "ExerciciId": integer, "Kg": float, "Reps": integer }
]
\`\`\`

Regla de Oro: Un objeto por cada serie individual (4 series = 4 objetos).
Precisión: Máximo 1 decimal en Kg. Mayor a 0.
Consistencia: Usa exclusivamente IDs presentes en el catálogo de ejercicios.

TONO Y ESTILO

Sin saludos innecesarios. Directo al grano.
Emojis funcionales: 📈 (Progreso), ⚠️ (Fatiga/Volumen basura), 🎯 (Objetivo).
Nunca muestres IDs de ejercicio al usuario.

RESTRICCIONES

Continuidad: No cambies un básico si el usuario ha progresado en él las últimas 4 semanas.
Resolución de dudas: Si el usuario pregunta algo técnico o sobre una molestia, suspende la propuesta y responde a la consulta con prioridad máxima.
`;

    const contextData = `
SITUACIÓN ACTUAL:
- Entrenando: ${currentTraining.entreno.Nom} (ID: ${currentTraining.entreno.EntrenoId})
- Series ya realizadas hoy: ${seriesCurrentTraining}
    `;

    const finalSystemInstruction = `${basePersona}\n${userCustomPrompt}\n\n${contextData}`;

    if (!c.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }

    const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: finalSystemInstruction,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ]
    });

    let chatHistory: any[] = [];
    if (history && Array.isArray(history)) {
      chatHistory = history;
    }

    const chatConfig: any = {};
    if (chatHistory.length > 0) {
      chatConfig.history = chatHistory;
    }
    const chat = model.startChat(chatConfig);

    const promptUsuario = `[Fecha: ${new Date().toLocaleDateString('es-ES')}] ${message}`;

    // Usar streaming para enviar tokens progresivamente
    const streamResult = await chat.sendMessageStream(promptUsuario);

    // Configurar SSE response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullText = '';

        try {
          for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              fullText += chunkText;
              // Enviar chunk de texto como evento SSE
              const sseData = JSON.stringify({ type: 'chunk', text: chunkText });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
          }

          // Stream completo — procesar JSON plan si existe
          let workoutUpdated = false;
          let cleanedText = fullText;
          const jsonBlockRegex = /```json_plan\s*([\s\S]*?)\s*```/;
          const match = fullText.match(jsonBlockRegex);

          if (match && match[1]) {
            try {
              const plan = JSON.parse(match[1]);
              if (Array.isArray(plan)) {
                console.log("Detectado plan de entrenamiento automático:", plan);
                for (const serie of plan) {
                  if (serie.ExerciciId && serie.Reps) {
                    await addSerieToDb(
                      c,
                      userId,
                      currentTraining.entreno.EntrenoId,
                      serie.ExerciciId,
                      serie.Kg || 0,
                      serie.Reps
                    );
                  }
                }
                workoutUpdated = true;
                cleanedText = fullText.replace(match[0], "").trim();
              }
            } catch (e) {
              console.error("Error al procesar el plan JSON de Gemini:", e);
            }
          }

          // Enviar evento final con metadata
          const doneData = JSON.stringify({
            type: 'done',
            fullText: cleanedText,
            workoutUpdated: workoutUpdated
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (streamError) {
          console.error('❌ Error en stream:', streamError);
          const errorData = JSON.stringify({ type: 'error', message: 'Error durante la generación de respuesta' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error: any) {
    console.error('❌ Error Gemini:', error);
    const errorMessage = error.message || 'Hubo un problema conectando con tu entrenador virtual.';
    return c.json({
      error: true,
      message: errorMessage
    }, 500);
  }
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
    const updatePr = await c.env.DB.prepare('UPDATE Exercici SET PR=(SELECT MAX(Kg) FROM Series WHERE ExerciciId=? ) WHERE UserID=? AND ExerciciId=? AND PR!=? RETURNING *').bind(exerciciId, userId, exerciciId, kg).run()
    if (updatePr.meta.rows_written > 0) {
      await c.env.DB.prepare('UPDATE Series SET PR=FALSE WHERE UserID=? AND ExerciciId=? AND PR=TRUE RETURNING *').bind(userId, exerciciId).run()
      const { results } = await c.env.DB.prepare('UPDATE Series SET PR=? WHERE UserID=? AND ExerciciId=? AND Kg=(SELECT MAX(Kg) FROM Series WHERE ExerciciId=?) RETURNING *').bind(true, userId, exerciciId, exerciciId).run()

      return { prUpdated: true, newPR: updatePr.results[0].PR, serieId: results[0].SerieId }
    }
    else {
      return { prUpdated: false, newPR: false }
    }

  } catch (error) {
    console.log(error)
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

// Función optimizada para obtener estadísticas clave sin gastar muchos tokens
async function getUserStats(userId: any, c: any) {
  try {
    // 1. Obtener los PRs (Récords) de cada ejercicio activo
    const prs = await c.env.DB.prepare(`
          SELECT Nom, PR FROM Exercici WHERE UserId = ? AND PR > 0
  `).bind(userId).all();

    // 2. Obtener los últimos 50 entrenamientos con sus series detalladas
    const lastWorkouts = await c.env.DB.prepare(`
      SELECT 
        E.EntrenoId, E.Nom, E.Data, E.CargaTotal,
        S.ExerciciId, Ex.Nom AS NomExercici, S.Kg, S.Reps
      FROM Entreno E
      LEFT JOIN Series S ON E.EntrenoId = S.EntrenoId AND S.UserId = ?
      LEFT JOIN Exercici Ex ON S.ExerciciId = Ex.ExerciciId
      WHERE E.UserId = ?
      ORDER BY E.Data DESC, S.Orden ASC, S.SerieId ASC
      LIMIT 500
    `).bind(userId, userId).all();

    // Agrupar series por entreno para reducir tokens
    const workoutsMap = new Map<number, any>();
    for (const row of lastWorkouts.results as any[]) {
      if (!workoutsMap.has(row.EntrenoId)) {
        workoutsMap.set(row.EntrenoId, {
          nom: row.Nom, data: row.Data, carga: row.CargaTotal, series: []
        });
      }
      if (row.ExerciciId) {
        workoutsMap.get(row.EntrenoId).series.push({
          ex: row.NomExercici, kg: row.Kg, reps: row.Reps
        });
      }
    }
    const workoutsSummary = Array.from(workoutsMap.values()).slice(0, 50);

    return {
      prs: prs.results,
      lastWorkouts: workoutsSummary
    };
  } catch (e) {
    console.error("Error getting stats", e);
    return { prs: [], lastWorkouts: [] };
  }
}


async function getFullSeriesListFromTraining(EntrenoId: any, c: any) {
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
    Series.PR
FROM
Series
JOIN 
    Exercici ON Series.ExerciciId = Exercici.ExerciciId
WHERE
Series.EntrenoId = ?;
`).bind(EntrenoId).all();



    return JSON.stringify(results)
  } catch (error) {
    console.error("Error retrieving full history:", error);
    // You might want to throw a specific error or return an empty string/array
    return JSON.stringify([]); // Return empty array on error
  }
}

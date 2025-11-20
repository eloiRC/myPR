import { Context, Hono } from 'hono'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { nouExercici, petition, getEntrenos, novaSerie, getEntreno, editSerie, signup, login, deleteSerie, editExercici, getGrupsMusculars, getExercici, getPesosHistorial, nouEntreno, editEntreno, getCargaHistorial, chatGPT, updateUser, getUser } from './schema'
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
  const data = Math.floor(Date.now() / 1000)
  const carga = kg * reps
  const userId = await c.get('jwtPayload').UserId
  let prUpdated = false

  try {
    const updatePr = await c.env.DB.prepare('UPDATE Exercici SET PR=? WHERE UserID=? AND ExerciciId=? AND ? > PR ').bind(kg, userId, exerciciId, kg).run()

    if (updatePr.meta.rows_written > 0) {
      prUpdated = true;
      const resetPr = await c.env.DB.prepare('UPDATE Series SET PR=FALSE WHERE UserID=? AND ExerciciId=? AND PR=TRUE ').bind(userId, exerciciId).run()

    }
    const result = await c.env.DB.prepare('INSERT INTO Series (UserId,EntrenoId,ExerciciId,Kg,Reps,Carga,PR,Data) VALUES (?,?,?,?,?,?,?,?) RETURNING *').bind(userId, entrenoId, exerciciId, kg, reps, carga, prUpdated, data).run()
    const updateCarga = await c.env.DB.prepare('UPDATE Entreno SET CargaTotal=CargaTotal+? WHERE UserID=? AND EntrenoId=?  RETURNING *').bind(carga, userId, entrenoId).run()


    return c.json({ message: 'Serie Guardada', serieId: result.results[0].SerieId, newPr: prUpdated, cargaTotal: updateCarga.results[0].CargaTotal })

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
    const resultsS = await c.env.DB.prepare('SELECT * FROM Series WHERE EntrenoId = ? AND UserId=?').bind(entrenoId, userId).all();

    return c.json({ entreno: resultsE.results, series: resultsS.results })
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


// Endpoint para Gemini
app.post('/api/gemini', zValidator('json', chatGPT), async (c) => {
  const { message, currentTraining, chatId } = await c.req.json();
  const userId = await c.get('jwtPayload').UserId;

  try {
    const userStats = await getUserStats(userId, c);
    const seriesCurrentTraining = await getFullSeriesListFromTraining(currentTraining.entreno.EntrenoId, c);
    const ejerciciosEntrenoActual = currentTraining.ejercicios.map(({ UserID, GrupMuscular1, GrupMuscular2, GrupMuscular3, GrupMuscular4, GrupMuscular5, ...rest }: any) => rest);

    // Obtener prompt personalizado del usuario
    const user = await c.env.DB.prepare('SELECT ChatbotPrompt FROM Users WHERE UserId = ?').bind(userId).first();
    const userCustomPrompt = user?.ChatbotPrompt ? `\n\nINSTRUCCIONES PERSONALIZADAS DEL USUARIO:\n${user.ChatbotPrompt}` : '';
    // --- PROMPT MEJORADO ---
    // Instrucciones claras para que actúe como planificador experto y directo
    const basePersona = `
      ESTILO DE RESPUESTA:
  1. DIRECTO: No uses frases de relleno("Claro que sí", "Excelente elección").Ve al grano.
      2. CONCISO: Respuestas cortas y legibles.
      3. PERSONALIZADO: Usa los datos del usuario(PRs) para sugerir cargas reales.

      CUANDO TE PIDA PLANIFICAR / CREAR UNA RUTINA:
      Debes responder OBLIGATORIAMENTE con este formato estructurado para cada ejercicio:
  - Nombre Ejercicio | Series x Repeticiones | Intensidad(RIR) | Notas breves

  Ejemplo: "Press Banca | 3 x 8-10 | RIR 2 | Controla la bajada".

      REGLAS DE DATOS:
  - Si el usuario tiene un PR registrado(ej: Banca 100kg), sugiérele pesos basados en ese % (ej: "Usa unos 75-80kg").
      - Si no tienes datos, pide que haga una serie de aproximación.
      - Idioma: Español.

Base de Conocimiento General para Coach AI

1. Protocolo de Estancamiento(La Regla de la Periodización)

Si el usuario menciona que NO PROGRESA en un ejercicio o está ESTANCADO:

Diagnóstico: Verifica si lleva semanas haciendo las mismas series y repeticiones(Ej: siempre 4x10).

  Solución(Periodización Ondulante): Sugiere alternar la intensidad en las sesiones.

Sesión A(Tensión Mecánica / Fuerza): Bajar repeticiones(3 - 6), subir peso, descansos largos(3min).

Sesión B(Estrés Metabólico / Hipertrofia): Subir repeticiones(10 - 15), peso moderado, descansos cortos(90s).

Frase Clave: "Para romper ese estancamiento, deja de tirar siempre igual. Hoy haz series pesadas de 5 repeticiones, y la próxima vez busca el bombeo a 12 repeticiones."

2. Selección de Carga(RPE y RIR)

Si el usuario pregunta "QUÉ PESO USO" y no hay datos previos:

Regla RIR(Repeticiones en Recámara): Recomienda un peso con el que llegue al final de la serie sintiendo que podría hacer solo 1 o 2 más, pero no más.

Protocolo de Aproximación:

Serie 1: 50 % del esfuerzo percibido(calentamiento).

  Serie 2: 75 % del esfuerzo.

Serie Efectiva: Buscar el RIR 2.

3. Gestión de Fatiga(Deload / Descarga)

Si el usuario menciona DOLOR ARTICULAR, CANSANCIO EXTREMO o REGRESIÓN en pesos:

Diagnóstico: Posible fatiga del Sistema Nervioso Central(SNC).

  Solución: Recomendar una Semana de Descarga.

Mantener los mismos ejercicios.

Reducir el peso al 60 % de lo habitual O reducir las series a la mitad.

  Objetivo: Recuperación activa, no inactividad total.

4. Selección de Ejercicios(Biomecánica)

Si el usuario siente MOLESTIA o no siente el músculo objetivo:

Regla de Estabilidad: Si el usuario falla por equilibrio antes que por fuerza muscular(ej: Sentadilla libre inestable), sugerir variantes más estables(Hack Squat, Multipower, Prensa) para priorizar la hipertrofia.

Regla de Dolor: Si un ejercicio duele(dolor malo, no agujetas), buscar inmediatamente una variante biomecánica(Ej: Press Banca con barra -> Press con Mancuernas neutro o Máquina).

5. Progresión(Sobrecarga Progresiva)

Si el usuario pregunta CÓMO MEJORAR:

Explicar que subir peso no es la única vía.

Vías de mejora:

Más peso(Intensidad).

Más repeticiones con el mismo peso(Volumen).

Mejor técnica / Tempo más lento(Tensión).

Menos descanso entre series(Densidad).

INSTRUCCIÓN DE COMPORTAMIENTO EXTRA:
Siempre que sugieras una rutina o cambio, justifica brevemente EL PORQUÉ basándote en estos principios. (Ej: "Haz 3x5 hoy porque llevas semanas estancado en 3x10 y necesitamos estimular la fuerza").
    `;



    const contextData = `
      DATOS DEL USUARIO(Contexto Real):
- Récords Personales(PRs) actuales: ${JSON.stringify(userStats.prs)}
- Últimos 50 entrenamientos: ${JSON.stringify(userStats.lastWorkouts)}
      
      SITUACIÓN ACTUAL(AHORA MISMO):
- Entrenando: ${currentTraining.entreno.Nom}
- Ejercicios disponibles en la rutina: ${JSON.stringify(ejerciciosEntrenoActual)}
- Series ya realizadas hoy: ${seriesCurrentTraining}
`;

    const finalSystemInstruction = `${basePersona} \n${userCustomPrompt} \n\n${contextData} `;

    if (!c.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }

    const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);

    // NOTA: 'gemini-2.5-flash' no existe públicamente aún. 
    // Se usa 'gemini-2.0-flash-exp' (Experimental, muy rápido y mejor razonamiento) 
    // O 'gemini-1.5-flash' (Estable).
    // Cambia a 'gemini-1.5-flash' si el modelo experimental da errores con tu API Key.
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // Usamos la versión más potente disponible tipo Flash
      systemInstruction: finalSystemInstruction,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ]
    });

    let chatHistory: any[] = [];
    if (chatId) {
      try {
        const parsed = JSON.parse(chatId);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validar y mapear el historial al formato correcto de Gemini
          chatHistory = parsed
            .filter((item: any) =>
              item &&
              typeof item === 'object' &&
              (item.role === 'user' || item.role === 'model') &&
              item.parts &&
              Array.isArray(item.parts)
            )
            .map((item: any) => ({
              role: item.role === 'user' ? 'user' : 'model',
              parts: item.parts.map((part: any) => {
                // Asegurar que cada part tenga el formato correcto
                if (typeof part === 'string') {
                  return { text: part };
                } else if (part && typeof part === 'object' && part.text) {
                  return { text: part.text };
                }
                return part;
              })
            }));
          console.log(`📚 Historial cargado: ${chatHistory.length} mensajes`);
        }
      } catch (e) {
        console.warn('⚠️ Error parseando historial, iniciando chat limpio:', e);
        chatHistory = [];
      }
    }

    // Iniciar chat con historial (vacío si es primera vez)
    const chatConfig: any = {};
    if (chatHistory.length > 0) {
      chatConfig.history = chatHistory;
    }
    const chat = model.startChat(chatConfig);

    const promptUsuario = `[Fecha: ${new Date().toLocaleDateString('es-ES')}] ${message} `;

    const result = await chat.sendMessage(promptUsuario);
    const response = result.response.text();
    const newHistory = chat.getHistory();

    return c.json({
      response,
      responseId: JSON.stringify(newHistory)
    });

  } catch (error: any) {
    console.error('❌ Error Gemini:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
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

    // 2. Obtener solo los últimos 5 entrenamientos (resumen ligero)
    const lastWorkouts = await c.env.DB.prepare(`
          SELECT Nom, Data, CargaTotal, Puntuacio 
          FROM Entreno 
          WHERE UserId = ?
  ORDER BY Data DESC 
          LIMIT 50
  `).bind(userId).all();

    return {
      prs: prs.results,
      lastWorkouts: lastWorkouts.results
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
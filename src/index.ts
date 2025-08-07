import { Context, Hono } from 'hono'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { nouExercici, petition, getEntrenos, novaSerie, getEntreno, editSerie, signup, login, deleteSerie, editExercici, getGrupsMusculars, getExercici, getPesosHistorial, nouEntreno, editEntreno, getCargaHistorial, chatGPT } from './schema'
import { hashPassword, verifyPassword, generateJWT, verifyJWT } from './jwt'
import OpenAI from 'openai'
import { startsWith } from 'zod/v4'


type Bindings = {
  DB: D1Database;
  test_password: string;
  jwt_secret: string;
  OPENAI_API_KEY: string;
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
  console.log(token)
  try {
    const decodedPayload = await verifyJWT(token, c.env.jwt_secret);

    c.set('jwtPayload', decodedPayload)
    console.log(c.get('jwtPayload'))
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

// Endpoint simple para probar la conexión con OpenAI
app.post('/api/test-openai', async (c) => {
  try {
    console.log('🧪 Probando conexión básica con OpenAI...');

    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Di "Hola, la conexión funciona correctamente"'
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    console.log('✅ Conexión exitosa:', response);

    return c.json({
      success: true,
      message: 'Conexión con OpenAI establecida correctamente',
      response: response
    });
  } catch (error: any) {
    console.error('❌ Error en prueba de conexión:', error);
    return c.json({
      success: false,
      message: `Error de conexión: ${error.message}`,
      details: {
        name: error?.name,
        status: error?.status,
        type: error?.type
      }
    }, 500);
  }
});


//todo: crear un historial de chat per usuari a la bd
//anadir una columna "chatHistory" a la taula "Users"
//guardar el historial de chat en formato JSON en la columna "chatHistory" de la taula "Users"
//cada vegada que es fa una peticio a l'endpoint de ChatGPT, s'afegeix el missatge al historial
//es demana el historial de chat al front end per mostrar-lo cuan es carrega la pagina


//todo: endpoint para borrar el historial de chat



// Endpoint para ChatGPT
app.post('/api/chatgpt', zValidator('json', chatGPT), async (c) => {
  const { message, currentTraining, isFirstMessage, chatId } = await c.req.json();
  let promptId = 'pmpt_688f9785fee48190b0da02dd3234ca8e0bfd3e2a9012ba01';
  const userId = await c.get('jwtPayload').UserId;
  //si el usario es el 13 y el primer caracter del mensaje es + se una un promptId diferente 
  if (userId == 13 && startsWith(message, '+')) promptId = 'pmpt_6893adeca5148197a5d16728f6f8515d092829a17abd6cec';

  const seriesCurrentTraining = await getFullSeriesListFromTraining(currentTraining.entreno.EntrenoId, c)
  //remove grupos musculares de los ejercicios
  currentTraining.ejercicios = currentTraining.ejercicios.map((ejercicio: any) => {
    const { UserID, GrupMuscular1, GrupMuscular2, GrupMuscular3, GrupMuscular4, GrupMuscular5, ...rest } = ejercicio;
    return rest;
  });

  const ejercicios = JSON.stringify(currentTraining.ejercicios);

  try {
    // Construir el contexto para ChatGPT
    var contexto = '';

    if (isFirstMessage) {


      const history = await getFullHistory(currentTraining.entreno.UserId, c)
      contexto = contexto + "Historial de entrenos del usuario en json: '''" + history + "'''";
      contexto = contexto + " Lista de ejercicios del usuario con sus pr y grupos musculares en json: '''" + ejercicios + "''' estos son los tiene guardados pero puedes proponer nuevos ejercicios si lo crees necesario";
    }

    // Llamada real a la API de OpenAI usando el nuevo formato
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    contexto = `${contexto} 
INFORMACIÓN DEL USUARIO:
- Entrenamiento actual: ${currentTraining.entreno.Nom} (${currentTraining.entreno.CargaTotal}kg total)
- Series realizadas: ${currentTraining.series.length}
- PRs logrados en este entrenamiento: ${currentTraining.series.filter((serie: any) => serie.PR).length}

Entreno actual para que puedas ver los ejercicios y series realizadas en este entreno:
JSON: '''${seriesCurrentTraining}'''



CONTEXTO ADICIONAL:
- Fecha actual: ${new Date().toLocaleDateString('es-ES')}
- Hora actual: ${new Date().toLocaleTimeString('es-ES')}
- Día de la semana: ${new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
- Es el primer mensaje: ${isFirstMessage ? 'SÍ' : 'NO'}



MENSAJE DEL USUARIO:
${message}`;

    console.log('🔍 Iniciando llamada a OpenAI...');
    console.log('📝 Prompt ID:', "pmpt_688f9785fee48190b0da02dd3234ca8e0bfd3e2a9012ba01");




    try {
      // Intentar entrar les dades per un altre input?

      console.log(contexto);

      console.log('🔄 Intentando API de responses...');
      const openaiResponse = await openai.responses.create({
        prompt: {
          "id": promptId
        },
        input: contexto,
        previous_response_id: chatId || null,
        text: {
          "format": {
            "type": "text"
          }
        },
        reasoning: {},
        max_output_tokens: 2048,
        store: true,
        temperature: 1,
        top_p: 1,
        tool_choice: "auto",
      });

      // fer que el front end guardi la conversa per seguir hitorial?
      // te que haber una forma mes facil
      console.log('✅ Respuesta recibida de OpenAI Responses API');
      console.log('📄 Respuesta:', openaiResponse);

      let responseId = openaiResponse.id
      let response = typeof openaiResponse.output_text === 'string' ? openaiResponse.output_text : 'Respuesta no válida';
      return c.json({ response, responseId });
    } catch (error) {
      const message = "error " + error
      throw new HTTPException(500, { message: message })


    }
  } catch (error) {
    // Si es un error de OpenAI, dar más detalles
    return c.text('error sql query', 500)
  }
});

app.onError((err, c) => {
  console.error(`${err}`)
  if (err.message == "error sql query") {
    return c.text('error sql query', 500)
  }
  return c.text('Uknown error', 500)
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
async function getFullHistory(userId: any, c: any) {
  try {
    const { results } = await c.env.DB.prepare(`
    SELECT
        T1.EntrenoId,
        T1.Nom AS NombreEntreno,
        T1.Descripcio AS DescripcionEntreno,
        T1.Puntuacio AS PuntuacionEntreno,
        T1.CargaTotal,
        DATE(T1.Data, 'unixepoch') AS FechaEntreno,
        T2.SerieId,
        T2.Kg,
        T2.Reps,
        T3.Nom AS NombreEjercicio
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
        T2.SerieId ASC;
`).bind(userId).all();



    return JSON.stringify(results)
  } catch (error) {
    console.error("Error retrieving full history:", error);
    // You might want to throw a specific error or return an empty string/array
    return JSON.stringify([]); // Return empty array on error
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


import { Context, Hono } from 'hono'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { verify, sign, decode, jwt } from 'hono/jwt'
import { schema, nouExercici, petition, getEntrenos, novaSerie, getEntreno, editSerie } from './schema'
import { checkOptionalParameter } from 'hono/utils/url'


type Bindings = {
  DB: D1Database;
  test_password: string;
  jwt_secret: string;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(logger())

app.use('/api/*', async (c, next) => {
  const { token } = await c.req.json();
  console.log(token)
  try {
    const decodedPayload = await verify(token, c.env.jwt_secret)
    c.set('jwtPayload', decodedPayload)
    await next()

  } catch (error) {
    return c.json({ message: 'invalid token' })

  }


})

//crear un exercisi nou, requerim nom y grup muscular(id del grup)
app.post('/api/nouExercici', zValidator('json', nouExercici), async (c) => {
  const { nom, grups_musculars } = await c.req.json();

  let GM1 = grups_musculars[0] || null
  let GM2 = grups_musculars[1] || null
  let GM3 = grups_musculars[2] || null
  let GM4 = grups_musculars[3] || null
  let GM5 = grups_musculars[4] || null

  try {
    const result = await c.env.DB.prepare('INSERT INTO Exercici (Nom, UserId, PR, GrupMuscular1, GrupMuscular2, GrupMuscular3, GrupMuscular4, GrupMuscular5) VALUES (?, ?, 0, ?, ?, ?, ?, ?);').bind(nom, await c.get('jwtPayload').UserId, GM1, GM2, GM3, GM4, GM5).run()
    return c.json({ message: 'exercici creat', idExecici: result.meta.last_row_id })

  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

//creem un entreno nou l'entrem a la DB retoem OK, Id de l'entereno i data de creacio
app.post('/api/nouEntreno', async (c) => {
  const data = Math.floor(Date.now() / 1000)


  try {
    const result = await c.env.DB.prepare('INSERT INTO Entreno (UserId,Data,CargaTotal) VALUES (?, ?,?);').bind(await c.get('jwtPayload').UserId, data, 0).run()
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
    const result = await c.env.DB.prepare('INSERT INTO Series (UserId,EntrenoId,ExerciciId,Kg,Reps,Carga,Data) VALUES (?,?,?,?,?,?,?) RETURNING *').bind(userId, entrenoId, exerciciId, kg, reps, carga, data).run()
    const updatePr = await c.env.DB.prepare('UPDATE Exercici SET PR=? WHERE UserID=? AND ExerciciId=? AND ? > PR').bind(kg, userId, exerciciId, kg).run()
    const updateCarga = await c.env.DB.prepare('UPDATE Entreno SET CargaTotal=CargaTotal+? WHERE UserID=? AND EntrenoId=?  RETURNING *').bind(carga, userId, entrenoId).run()

    if (updatePr.meta.rows_written > 0) {
      prUpdated = true;
    }
    return c.json({ message: 'Serie Guardada', serieId: result.results[0].SerieId, prUpdated: prUpdated, cargaTotal: updateCarga.results[0].CargaTotal })

  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }
})

//todo actualitzar una serie (serieID,kg,reps,actualitzem carga i PR si cal)
app.post('/api/editSerie', zValidator('json', editSerie), async (c, next) => {
  const { exerciciId, kg, reps, serieId, entrenoId } = await c.req.json()
  const carga = kg * reps
  const userId = await c.get('jwtPayload').UserId
  let newPr = false

  try {
    //actualitzem la serie
    const updateSerie = await c.env.DB.prepare('UPDATE Series SET Kg=?,Reps=?,Carga=? WHERE UserID=? AND SerieId=?  RETURNING *').bind(kg, reps, carga, userId, serieId).run()

    //actualitzem el pr
    const updatePr = await checkPr(c, userId, exerciciId, kg)

    //actualitzem la carga total de l'entreno
    const updateCT = await updateCargaTotal(c, userId, entrenoId)

    console.log(updateSerie)
    if (updatePr.prUpdated && updatePr.newPR == kg) {
      newPr = true
    }
    return c.json({ message: 'Serie Actualitzada', serieId: updateSerie.results[0].SerieId, prUpdated: newPr, cargaTotal: updateCT.results[0].CargaTotal })

  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }
})


//retorna tots els entrtenos entre dos dates d'un usuari
app.get('/api/getEntrenos', zValidator('json', getEntrenos), async (c) => {
  const { dataInici, dataFi } = await c.req.json()

  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM Entreno WHERE UserId=? AND Data > ? AND Data < ?').bind(c.get('jwtPayload').UserId, dataInici, dataFi).all()
    return c.json(results)
  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })

  }

})

//retona dades de l'entreno + series 
app.get('/api/getEntreno', zValidator('json', getEntreno), async (c) => {
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


app.get('/api/getExercicis', zValidator('json', petition), async (c) => {//retorna tots els exercisi de la taula d'aquest usuari

  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM EXERCICI WHERE UserId=?').bind(c.get('jwtPayload').UserId).all();
    return c.json(results)
  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })

  }

})


app.post('/login', zValidator('json', schema), async (c) => {
  const { email, password } = await c.req.json();

  if (!email && !password) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }


  //todo la contrasenya no s'encripta ni desencripta esta a la DB en text pla !! 

  try {
    //busquem usauri a la DB y retornem contrasenya
    let results = await c.env.DB.prepare('SELECT * FROM Users WHERE Email=?').bind(email).first() || { Password: "no" };
    if (password == results.Password) {
      console.log("log in succesfull")


      const payload = {
        email: email,
        UserId: results.UserId,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60// 7 dies 
      }

      //generem jwt token 
      const token = await sign(payload, c.env.jwt_secret)

      //retornem el jwt token al client
      return c.json({ message: 'authorized', token: token })

    }
    else {
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }
  } catch (error) {
    throw new HTTPException(500, { message: 'error sql query' })
  }




})

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
      return { prUpdated: true, newPR: updatePr.results[0].PR }
    }
    else {
      return { prUpdated: false, newPR: null }
    }

  } catch (error) {
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


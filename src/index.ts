import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from 'hono/http-exception'
import { verify, sign, decode, jwt } from 'hono/jwt'
import { schema, nouExercici, petition } from './schema'


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

  const result = await c.env.DB.prepare('INSERT INTO Exercici (Nom, UserId, PR, GrupMuscular1, GrupMuscular2, GrupMuscular3, GrupMuscular4, GrupMuscular5) VALUES (?, ?, 0, ?, ?, ?, ?, ?);').bind(nom, await c.get('jwtPayload').UserId, GM1, GM2, GM3, GM4, GM5).run()
  return c.json({ message: 'exercici creat', idExecici: result.meta.last_row_id })

})

//creem un entreno nou l'entrem a la DB retoem OK, Id de l'entereno i data de creacio
app.post('/api/nouEntreno', async (c) => {
  const data = Math.floor(Date.now() / 1000)

  const result = await c.env.DB.prepare('INSERT INTO Entreno (UserId,Data,CargaTotal) VALUES (?, ?,?);').bind(await c.get('jwtPayload').UserId, data, 0).run()
  return c.json({ message: 'Nou Entreno Creat', idEntreno: result.meta.last_row_id, DataInici: data })

})

//retorna tots els entrtenos entre dos dates d'un usuari
app.get('/api/entrenos', zValidator('json', getEntrenos), async (c) => {
  //revem variables data inici + fi, 

  //todo
  const { results } = await c.env.DB.prepare('SELECT * FROM EXERCICI WHERE UserId=?').bind(c.get('jwtPayload').UserId).all();
  return c.json(results)
})


app.get('/api/exercicis', zValidator('json', petition), async (c) => {//retorna tots els exercisi de la taula d'aquest usuari

  const { results } = await c.env.DB.prepare('SELECT * FROM EXERCICI WHERE UserId=?').bind(c.get('jwtPayload').UserId).all();
  return c.json(results)
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
    throw new HTTPException(401, { message: 'error sql query' })
  }




})

app.onError((err, c) => {
  console.error(`${err}`)
  return c.text('Uknown error', 500)
})



export default app

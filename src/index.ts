import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { env } from 'hono/adapter'

type Bindings = {
  test_password: string
}

const app = new Hono<{ Bindings: Bindings }>()

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, { message: "Minimum eight characters, at least one letter and one number " })
})

app.use(logger())

app.post('/login', zValidator('json', schema), async (c) => {
  const { email, password } = await c.req.json();

  //todo comprovar password con la bd
  if (password == c.env.test_password && email == "eloirebollo97@gmail.com") {
    console.log("log in succesfull")
    return c.text("login succesfull")
    //todo return a token?
  }
  else {
    return c.text("login failed")
  }

})

export default app
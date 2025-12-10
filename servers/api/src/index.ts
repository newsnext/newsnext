import { Hono } from 'hono'
import { logger } from 'hono/logger'


const app = new Hono()

app.use(logger())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})


app.get('/boards/:boardId', (c) => {
  const boardId = c.req.param("boardId")
  return c.text(`Hello Hono! ${boardId}`)
})

app.get('/sources/:sourceId', (c) => {
  const sourceId = c.req.param('sourceId')
  return c.text(`Hello Hono! ${sourceId}`)
})

export default {
  port: process.env.PORT ?? 3002,
  fetch: app.fetch,
}

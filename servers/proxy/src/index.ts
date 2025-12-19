import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { HomePage } from "./pages/home"
import sourcesRoute from "./routes/sources"

const app = new Hono()

app.use(logger())
app.use("/*", cors())

app.get("/", (c) => {
  return c.html(HomePage)
})

app.route("/sources", sourcesRoute)

export default {
  port: process.env.PORT ?? 4001,
  fetch: app.fetch,
}

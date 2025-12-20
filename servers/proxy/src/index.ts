import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import sourcesRoute from "./sources"

const app = new Hono()

app.use(logger())
app.use("/*", cors())

app.route("/sources", sourcesRoute)

export default {
  fetch: app.fetch,
}

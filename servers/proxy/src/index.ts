import { MemoryCacheAdapter } from "@newsnext/cache/memory"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import sourcesRoute from "./sources"

const app = new Hono()
const cacheAdapter = new MemoryCacheAdapter()

app.use(logger())
app.use("/*", cors())

app.route("/api", sourcesRoute(cacheAdapter))

export default {
  fetch: app.fetch,
  port: 4001,
}

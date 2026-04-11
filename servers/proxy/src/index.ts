import { MemoryCacheAdapter } from "@newsnext/cache/memory"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import feedsRoute from "./feeds"

const app = new Hono()
const cacheAdapter = new MemoryCacheAdapter()

app.use(logger())
app.use("/*", cors())

app.route("/feeds", feedsRoute(cacheAdapter))

export default {
  fetch: app.fetch,
  port: 4001,
}

import type { CacheAdapter } from "@newsnext/cache"
import type { AdapterLoader } from "./routes/trpc"
import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { CACHE_DB_PATH } from "../../../data"
import { authApp } from "./routes/auth"
import { proxyApp } from "./routes/proxy"
import { createTrpcApp } from "./routes/trpc"

export type { AppRouter } from "./routes/trpc/app-router"

interface Variables {
  adapter: CacheAdapter
}

const app = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>()

app.use(logger())
app.use("/*", cors({
  credentials: true,
  origin: (origin) => {
    const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean)

    if (trustedOrigins.length === 0) {
      return origin
    }

    return trustedOrigins.includes(origin) ? origin : null
  },
}))

const loadSqliteAdapter: AdapterLoader = async () => {
  const { SqliteCacheAdapter } = await import("@newsnext/cache/sqlite")
  console.log("Using Sqlite cache adapter")
  return new SqliteCacheAdapter(CACHE_DB_PATH)
}

app.route("/api/trpc", createTrpcApp(loadSqliteAdapter))
app.route("/api/p", proxyApp)
app.route("/api/auth", authApp)

app.get("/*", (c, next) => {
  return serveStatic({ root: "./public" })(c, next)
})

app.get("*", serveStatic({ path: "./public/index.html" }))

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}

import type { NewsNextDataInstance } from "@newsnext/instance"
import type { InstanceLoader } from "./routes/trpc"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { authApp } from "./routes/auth"
import { proxyApp } from "./routes/proxy"
import { createTrpcApp } from "./routes/trpc"

interface Variables {
  instance: NewsNextDataInstance
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

export const loadInstance: InstanceLoader = async (c) => {
  const { createCloudflareNewsNextInstance } = await import("@newsnext/instance")
  return createCloudflareNewsNextInstance({
    bindings: c.env,
  })
}

app.route("/api/trpc", createTrpcApp(loadInstance))

// Image proxy endpoint - /api/p/:encodedUrl
app.route("/api/p", proxyApp)

app.route("/api/auth", authApp)

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}

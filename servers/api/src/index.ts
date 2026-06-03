import type { NewsNextDataInstance } from "@newsnext/instance/types"
import type { InstanceLoader } from "./routes/trpc"
import type { ApiCloudflareBindings } from "./cloudflare-bindings"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { getCloudflareBindings } from "./cloudflare-bindings"
import { authApp } from "./routes/auth"
import { proxyApp } from "./routes/proxy"
import { createTrpcApp } from "./routes/trpc"

export type { AppRouter } from "./routes/trpc/app-router"

interface Variables {
  instance: NewsNextDataInstance
}

const app = new Hono<{ Bindings: ApiCloudflareBindings, Variables: Variables }>()

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
  const service = getInstanceService(c.env, c.req.raw)
  if (service) {
    const { RemoteNewsNextInstance } = await import("@newsnext/instance/remote")
    return new RemoteNewsNextInstance({
      url: "https://newsnext-instance.internal",
      fetch: (input, init) => service.fetch(toServiceRequest(input, init)),
    })
  }

  const remoteUrl = getInstanceRemoteUrl(c.env, c.req.raw)
  if (remoteUrl) {
    const { createRemoteNewsNextInstance } = await import("@newsnext/instance/remote")
    return createRemoteNewsNextInstance(remoteUrl)
  }

  const bindings = getCloudflareBindings(c.env, c.req.raw)
  if (!bindings) {
    const { createMemoryNewsNextInstance } = await import("@newsnext/instance/local")
    return createMemoryNewsNextInstance()
  }

  const { createCloudflareNewsNextInstance } = await import("@newsnext/instance/runtime")
  return createCloudflareNewsNextInstance({
    bindings,
  })
}

function getInstanceRemoteUrl(bindings: ApiCloudflareBindings | undefined, request: Request): string | undefined {
  const env = getNitroCloudflareEnv(request) ?? bindings
  return getEnvValue(env, "NEWSNEXT_INSTANCE_URL") ?? process.env.NEWSNEXT_INSTANCE_URL
}

interface InstanceServiceBinding {
  fetch: (request: Request) => Promise<Response>
}

function getInstanceService(bindings: ApiCloudflareBindings | undefined, request: Request): InstanceServiceBinding | undefined {
  const env = getNitroCloudflareEnv(request) ?? bindings
  const value = (env as Record<string, unknown> | undefined)?.INSTANCE
  if (isInstanceServiceBinding(value)) {
    return value
  }

  return undefined
}

function isInstanceServiceBinding(value: unknown): value is InstanceServiceBinding {
  return typeof value === "object"
    && value !== null
    && "fetch" in value
    && typeof value.fetch === "function"
}

function toServiceRequest(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Request {
  if (input instanceof Request) {
    return input
  }

  return new Request(input, init)
}

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: ApiCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

function getNitroCloudflareEnv(request: Request): ApiCloudflareBindings | undefined {
  return (request as NitroRequest).runtime?.cloudflare?.env
}

function getEnvValue(bindings: ApiCloudflareBindings | undefined, key: string): string | undefined {
  const value = (bindings as Record<string, unknown> | undefined)?.[key]
  return typeof value === "string" && value ? value : undefined
}

app.route("/api/trpc", createTrpcApp(loadInstance))

// Image proxy endpoint - /api/p/:encodedUrl
app.route("/api/p", proxyApp)

app.route("/api/auth", authApp)

app.get("/api", c => c.json({ name: "newsnext-api", ok: true }))
app.get("/api/", c => c.json({ name: "newsnext-api", ok: true }))

app.notFound((c) => c.json({ error: "Not Found" }, 404))

export default app

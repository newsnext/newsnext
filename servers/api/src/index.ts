import type { NewsNextDataInstance } from "@newsnext/instance/types"
import type { ApiCloudflareBindings } from "./cloudflare-bindings"
import type { H3Event } from "nitro"
import { getCloudflareBindings } from "./cloudflare-bindings"

export type { AppRouter } from "./routes/trpc/app-router"

let instance: NewsNextDataInstance | undefined

export async function loadInstance(event: H3Event): Promise<NewsNextDataInstance> {
  if (instance) {
    return instance
  }

  const service = getInstanceService(getNitroCloudflareEnv(event), event.req)
  if (service) {
    const { RemoteNewsNextInstance } = await import("@newsnext/instance/remote")
    instance = new RemoteNewsNextInstance({
      url: "https://newsnext-instance.internal",
      fetch: (input, init) => service.fetch(toServiceRequest(input, init)),
    })
    return instance
  }

  const remoteUrl = getInstanceRemoteUrl(getNitroCloudflareEnv(event), event.req)
  if (remoteUrl) {
    const { createRemoteNewsNextInstance } = await import("@newsnext/instance/remote")
    instance = createRemoteNewsNextInstance(remoteUrl)
    return instance
  }

  const bindings = getCloudflareBindings(getNitroCloudflareEnv(event), event.req)
  if (!bindings) {
    const { createMemoryNewsNextInstance } = await import("@newsnext/instance/local")
    instance = await createMemoryNewsNextInstance()
    return instance
  }

  const { createCloudflareNewsNextInstance } = await import("@newsnext/instance/runtime")
  instance = await createCloudflareNewsNextInstance({
    bindings,
  })
  return instance
}

function getInstanceRemoteUrl(bindings: ApiCloudflareBindings | undefined, request: Request): string | undefined {
  const env = getRequestNitroCloudflareEnv(request) ?? bindings
  return getEnvValue(env, "NEWSNEXT_INSTANCE_URL") ?? process.env.NEWSNEXT_INSTANCE_URL
}

interface InstanceServiceBinding {
  fetch: (request: Request) => Promise<Response>
}

function getInstanceService(bindings: ApiCloudflareBindings | undefined, request: Request): InstanceServiceBinding | undefined {
  const env = getRequestNitroCloudflareEnv(request) ?? bindings
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

  return new Request(input.toString(), init)
}

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: ApiCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

function getRequestNitroCloudflareEnv(request: Request): ApiCloudflareBindings | undefined {
  return (request as NitroRequest).runtime?.cloudflare?.env
}

function getNitroCloudflareEnv(event: H3Event): ApiCloudflareBindings | undefined {
  return (event.req as NitroRequest).runtime?.cloudflare?.env
}

function getEnvValue(bindings: ApiCloudflareBindings | undefined, key: string): string | undefined {
  const value = (bindings as Record<string, unknown> | undefined)?.[key]
  return typeof value === "string" && value ? value : undefined
}

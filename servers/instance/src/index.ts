import type { H3Event } from "nitro"
import { createCloudflareNewsNextInstance, createLocalNewsNextInstance } from "./runtime"

export * from "./app"
export * from "./errors"
export * from "./local"
export * from "./remote"
export * from "./runtime"
export * from "./source-loader"
export * from "./types"

type NitroCloudflareBindings = Partial<CloudflareBindings>

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: NitroCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

interface NitroGeneratedGlobal {
  __env__?: NitroCloudflareBindings
}

let instance: Awaited<ReturnType<typeof createLocalNewsNextInstance>> | undefined

export async function getNewsNextInstance(event: H3Event) {
  const bindings = await getNitroCloudflareEnv(event)
  if (instance) {
    if (bindings?.CACHE_DB && !await isCloudflareD1Instance(instance)) {
      instance = await createCloudflareNewsNextInstance({ bindings })
    }

    return instance
  }

  if (bindings?.CACHE_DB) {
    instance = await createCloudflareNewsNextInstance({ bindings })
    return instance
  }

  instance = await createLocalNewsNextInstance()
  return instance
}

async function getNitroCloudflareEnv(event: H3Event): Promise<NitroCloudflareBindings | undefined> {
  const requestEnv = (event.req as NitroRequest).runtime?.cloudflare?.env
    ?? (globalThis as NitroGeneratedGlobal).__env__
  if (requestEnv) {
    return requestEnv
  }

  try {
    const { env } = await import("cloudflare:workers")
    return env
  } catch {
    return undefined
  }
}

async function isCloudflareD1Instance(value: Awaited<ReturnType<typeof createLocalNewsNextInstance>>): Promise<boolean> {
  const debugInfo = await value.getDebugInfo?.()
  return debugInfo?.runtime === "cloudflare" && debugInfo.cache.type === "d1"
}

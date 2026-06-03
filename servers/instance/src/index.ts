export * from "./app"
export * from "./errors"
export * from "./local"
export * from "./remote"
export * from "./runtime"
export * from "./source-loader"
export * from "./types"

import type { H3Event } from "nitro"
import { createCloudflareNewsNextInstance, createLocalNewsNextInstance } from "./runtime"
import type { CloudflareNewsNextInstanceOptions } from "./types"

type CloudflareBindings = CloudflareNewsNextInstanceOptions["bindings"]

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: CloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

let instance: Awaited<ReturnType<typeof createLocalNewsNextInstance>> | undefined

export async function getNewsNextInstance(event: H3Event) {
  if (instance) {
    return instance
  }

  const bindings = getCloudflareBindings(getNitroCloudflareEnv(event), event.req)
  if (bindings) {
    instance = await createCloudflareNewsNextInstance({ bindings })
    return instance
  }

  instance = await createLocalNewsNextInstance()
  return instance
}

function getCloudflareBindings(
  bindings: CloudflareBindings | undefined,
  request: Request,
): CloudflareBindings | undefined {
  const nitroBindings = (request as NitroRequest).runtime?.cloudflare?.env
  if (nitroBindings?.CACHE_DB && nitroBindings.DATA_DB) {
    return nitroBindings
  }

  if (bindings?.CACHE_DB && bindings.DATA_DB) {
    return bindings
  }

  return undefined
}

function getNitroCloudflareEnv(event: H3Event): CloudflareBindings | undefined {
  return (event.req as NitroRequest).runtime?.cloudflare?.env
}

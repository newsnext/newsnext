export * from "./app"
export * from "./errors"
export * from "./local"
export * from "./remote"
export * from "./runtime"
export * from "./source-loader"
export * from "./types"

import { createNewsNextInstanceApp } from "./app"
import { createCloudflareNewsNextInstance, createLocalNewsNextInstance } from "./runtime"
import type { CloudflareNewsNextInstanceOptions } from "./types"

type CloudflareBindings = CloudflareNewsNextInstanceOptions["bindings"]
type InstanceApp = ReturnType<typeof createNewsNextInstanceApp>
type InstanceAppExecutionContext = Parameters<InstanceApp["fetch"]>[2]

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: CloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

let instanceApp: InstanceApp | undefined

const app = {
  async fetch(
    request: Request,
    env?: CloudflareBindings,
    executionCtx?: InstanceAppExecutionContext,
  ): Promise<Response> {
    instanceApp ??= createNewsNextInstanceApp(await createInstance(env, request))
    return instanceApp.fetch(request, env, executionCtx)
  },
}

async function createInstance(env: CloudflareBindings | undefined, request: Request) {
  const bindings = getCloudflareBindings(env, request)
  if (bindings) {
    return createCloudflareNewsNextInstance({ bindings })
  }

  return createLocalNewsNextInstance()
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

export default app

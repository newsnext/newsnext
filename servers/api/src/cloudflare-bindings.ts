export interface ApiCloudflareBindings {
  ICON_BUCKET?: unknown
  CACHE_DB?: unknown
  DATA_DB?: unknown
  INSTANCE?: unknown
  NEWSNEXT_INSTANCE_URL?: string
}

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: ApiCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

export function getCloudflareBindings(
  bindings: ApiCloudflareBindings | undefined,
  request: Request,
): ApiCloudflareBindings | undefined {
  const nitroBindings = (request as NitroRequest).runtime?.cloudflare?.env ?? getGlobalCloudflareEnv()
  if (nitroBindings) {
    return nitroBindings
  }

  if (!bindings) {
    return undefined
  }

  return hasCloudflareBinding(bindings) ? bindings : undefined
}

interface GlobalWithCloudflareEnv {
  __env__?: ApiCloudflareBindings
}

function getGlobalCloudflareEnv(): ApiCloudflareBindings | undefined {
  return (globalThis as GlobalWithCloudflareEnv).__env__
}

function hasCloudflareBinding(bindings: ApiCloudflareBindings): boolean {
  return Boolean(
    bindings.DATA_DB
    || bindings.CACHE_DB
    || bindings.ICON_BUCKET
    || bindings.INSTANCE
    || bindings.NEWSNEXT_INSTANCE_URL,
  )
}

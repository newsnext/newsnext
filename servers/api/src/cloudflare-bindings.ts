interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: CloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

export function getCloudflareBindings(
  bindings: CloudflareBindings | undefined,
  request: Request,
): CloudflareBindings | undefined {
  const nitroBindings = (request as NitroRequest).runtime?.cloudflare?.env
  if (nitroBindings) {
    return nitroBindings
  }

  if (!bindings) {
    return undefined
  }

  return bindings.DATA_DB && bindings.CACHE_DB && bindings.ICON_BUCKET ? bindings : undefined
}

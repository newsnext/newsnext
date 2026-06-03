import type { ApiCloudflareBindings } from "../../../src/cloudflare-bindings"
import type { H3Event } from "nitro"
import { defineHandler } from "nitro"
import { getCloudflareBindings } from "../../../src/cloudflare-bindings"

export default defineHandler(async (event) => {
  try {
    const { getAuth } = await import("../../../src/lib/auth")
    const bindings = getCloudflareBindings(getNitroCloudflareEnv(event), event.req)
    const auth = await getAuth(bindings)
    return await auth.handler(event.req)
  } catch (error) {
    console.error("[auth] Unhandled route error", formatRouteError(error))
    throw error
  }
})

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: ApiCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

function getNitroCloudflareEnv(event: H3Event): ApiCloudflareBindings | undefined {
  return (event.req as NitroRequest).runtime?.cloudflare?.env
}

function formatRouteError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return { error }
}

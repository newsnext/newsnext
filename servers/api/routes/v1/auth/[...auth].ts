import { defineHandler } from "nitro"
import { getNitroCloudflareEnv } from "@/cloudflare-bindings"

export default defineHandler(async (event) => {
  try {
    const { getAuth } = await import("@/lib/auth")
    const bindings = getNitroCloudflareEnv(event)
    const auth = await getAuth(bindings)
    return await auth.handler(event.req)
  } catch (error) {
    console.error("[auth] Unhandled route error", formatRouteError(error))
    throw error
  }
})

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

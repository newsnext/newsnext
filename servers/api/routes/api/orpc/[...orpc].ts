import type { H3Event } from "nitro"
import { RPCHandler } from "@orpc/server/fetch"
import { BatchHandlerPlugin } from "@orpc/server/plugins"
import { defineHandler } from "nitro"
import { loadInstance } from "@/index"
import { appRouter } from "@/routes/orpc/app-router"
import { createContext } from "@/routes/orpc/context"

const handler = new RPCHandler(appRouter, {
  plugins: [new BatchHandlerPlugin()],
})

export default defineHandler(async (event) => {
  try {
    const instance = await loadInstance(event)
    const { matched, response } = await handler.handle(event.req, {
      prefix: "/api/orpc",
      context: {
        ...await createContext({ event }),
        instance,
        waitUntil: getWaitUntil(event),
      },
    })

    if (matched) {
      return response
    }

    return new Response("Not Found", { status: 404 })
  } catch (error) {
    console.error("[oRPC] Unhandled route error", formatRouteError(error))
    throw error
  }
})

interface WaitUntilRequest extends Request {
  waitUntil?: (promise: Promise<unknown>) => void
}

function getWaitUntil(event: H3Event): ((promise: Promise<unknown>) => void) | undefined {
  const waitUntil = (event.req as WaitUntilRequest).waitUntil
  return typeof waitUntil === "function" ? promise => waitUntil.call(event.req, promise) : undefined
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

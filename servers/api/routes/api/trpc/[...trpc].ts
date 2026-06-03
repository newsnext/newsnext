import type { H3Event } from "nitro"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { defineHandler } from "nitro"
import { loadInstance } from "@/index"
import { appRouter } from "@/routes/trpc/app-router"
import { createContext } from "@/routes/trpc/context"

export default defineHandler(async (event) => {
  try {
    const instance = await loadInstance(event)

    return await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: event.req,
      router: appRouter,
      createContext: async () => ({
        ...await createContext({ event }),
        instance,
        waitUntil: getWaitUntil(event),
      }),
    })
  } catch (error) {
    console.error("[tRPC] Unhandled route error", formatRouteError(error))
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

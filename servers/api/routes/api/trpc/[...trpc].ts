import type { H3Event } from "nitro"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { defineHandler } from "nitro"
import { loadInstance } from "../../../src"
import { appRouter } from "../../../src/routes/trpc/app-router"
import { createContext } from "../../../src/routes/trpc/context"

export default defineHandler(async (event) => {
  const instance = await loadInstance(event)

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: event.req,
    router: appRouter,
    createContext: async () => ({
      ...await createContext({ event }),
      instance,
      waitUntil: getWaitUntil(event),
    }),
  })
})

interface WaitUntilRequest extends Request {
  waitUntil?: (promise: Promise<unknown>) => void
}

function getWaitUntil(event: H3Event): ((promise: Promise<unknown>) => void) | undefined {
  const waitUntil = (event.req as WaitUntilRequest).waitUntil
  return typeof waitUntil === "function" ? promise => waitUntil.call(event.req, promise) : undefined
}

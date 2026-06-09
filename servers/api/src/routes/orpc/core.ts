import type { Context } from "./context"
import { ORPCError, os } from "@orpc/server"

const base = os.$context<Context>()

export const publicProcedure = base

export const protectedProcedure = base.use(({ context, next }) => {
  if (!context.session) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Authentication required",
      cause: new Error("No session"),
    })
  }

  return next({
    context: {
      ...context,
      session: context.session,
    },
  })
})

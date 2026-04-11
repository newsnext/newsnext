import { metadata } from "@newsnext/sources/metadata"
import { executeSource, SourceServiceError } from "@newsnext/sources/service"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { publicProcedure, router } from "./core"

export const appRouter = router({
  getBoard: publicProcedure
    .input(z.object({
      boardId: z.enum(["recommend", "stars"]),
      starredSourceIds: z.array(z.string()).optional(),
    }))
    .query(({ input }) => {
      const { boardId, starredSourceIds = [] } = input
      if (boardId === "stars") {
        const starredSourceIdSet = new Set(starredSourceIds)
        return metadata.filter((source) => {
          const uniqueId = source.namespace ? `${source.namespace}:${source.id}` : source.id
          return starredSourceIdSet.has(uniqueId)
        })
      }
      return metadata
    }),

  getSource: publicProcedure
    .input(z.object({
      sourceId: z.string(),
      params: z.record(z.string(), z.any()).optional(),
      latest: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { sourceId, params = {}, latest } = input
      try {
        return await executeSource({
          sourceId,
          params,
          latest,
          adapter: ctx.adapter,
          waitUntil: ctx.waitUntil,
        })
      } catch (error) {
        if (error instanceof SourceServiceError) {
          throw new TRPCError({
            code: error.code === "GROUP_NOT_FOUND" || error.code === "SOURCE_NOT_FOUND"
              ? "NOT_FOUND"
              : "BAD_REQUEST",
            message: error.message,
          })
        }

        const err = error as Error
        console.error(`Error executing source ${sourceId}:`, err)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Internal Server Error",
        })
      }
    }),
})

export type AppRouter = typeof appRouter

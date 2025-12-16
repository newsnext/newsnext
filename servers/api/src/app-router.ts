import { getCachedSource } from "@newsnext/cache"
import { sources } from "@newsnext/sources"
import { metadata } from "@newsnext/sources/metadata"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { publicProcedure, router } from "./trpc"

export const appRouter = router({
  listSources: publicProcedure.query(() => {
    return metadata
  }),

  getBoard: publicProcedure
    .input(z.object({
      boardId: z.enum(["hottest", "timeline", "realtime"]),
    }))
    .query(({ input }) => {
      const { boardId } = input
      if (boardId === "hottest") {
        return metadata.filter(m => m.type === "hottest")
      }
      const timeline = metadata.filter(m => m.type !== "hottest")
      if (boardId === "timeline") {
        return timeline
      }
      return timeline.filter(m => m.interval <= 2 * 60 * 1000)
    }),

  getSource: publicProcedure
    .input(z.object({
      sourceId: z.string(),
      params: z.record(z.string(), z.any()).optional(),
      latest: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { sourceId, params: queryParams = {}, latest } = input
      const [group, id = "default"] = sourceId.split(":")

      if (!group || !id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid source ID format. Expected 'group:id'",
        })
      }

      const sourceGroup = sources[group as keyof typeof sources]
      if (!sourceGroup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Source group '${group}' not found`,
        })
      }

      const source = sourceGroup[id]
      if (!source) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Source '${id}' not found in group '${group}'`,
        })
      }

      if (!source.fetcher) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source does not have a fetcher",
        })
      }

      const params: Record<string, any> = {}
      if (source.params) {
        for (const [key, config] of Object.entries(source.params)) {
          const val = queryParams[key]
          if (val !== undefined) {
            switch (config.type) {
              case "number":
                params[key] = Number(val)
                break
              case "switch":
                params[key] = val === true || val === "true" || val === "1" || val === 1
                break
              default:
                params[key] = val
            }
          } else {
            params[key] = config.default
          }
        }
      }

      try {
        const result = await getCachedSource({
          key: sourceId,
          fetcher: () => source.fetcher(params),
          forceRefresh: latest,
        }, ctx.adapter)

        return {
          id: sourceId,
          ...result,
        }
      } catch (err: any) {
        console.error(`Error executing source ${sourceId}:`, err)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Internal Server Error",
        })
      }
    }),
})

export type AppRouter = typeof appRouter

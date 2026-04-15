import { feedDescriptors } from "@newsnext/feeds/metadata"
import { FeedServiceError, loadFeed, prepareFeedRequest } from "@newsnext/feeds/service"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { publicProcedure, router } from "./core"

const getFeedInputSchema = z.object({
  feedId: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  latest: z.boolean().optional(),
}).transform((input, ctx) => {
  try {
    const prepared = prepareFeedRequest(input.feedId, input.params ?? {})
    return {
      ...input,
      params: prepared.params as Record<string, unknown>,
    }
  } catch (error) {
    if (error instanceof FeedServiceError) {
      ctx.addIssue({
        code: "custom",
        message: error.message,
        path: error.code === "INVALID_PARAMS" ? ["params"] : ["feedId"],
      })
      return z.NEVER
    }

    throw error
  }
})

export const appRouter = router({
  getBoard: publicProcedure
    .input(z.object({
      boardId: z.enum(["featured", "copies", "stars"]),
      starredFeedIds: z.array(z.string()).optional(),
    }))
    .query(({ input }) => {
      const { boardId, starredFeedIds = [] } = input
      if (boardId === "stars") {
        const starredFeedIdSet = new Set(starredFeedIds)
        return feedDescriptors.filter((feed) => {
          const uniqueId = feed.provider ? `${feed.provider}:${feed.id}` : feed.id
          return starredFeedIdSet.has(uniqueId)
        })
      }
      return feedDescriptors
    }),

  getFeed: publicProcedure
    .input(getFeedInputSchema)
    .query(async ({ input, ctx }) => {
      const { feedId, params = {}, latest } = input
      try {
        return await loadFeed({
          feedId,
          params,
          paramsAreNormalized: true,
          latest,
          adapter: ctx.adapter,
          waitUntil: ctx.waitUntil,
        })
      } catch (error) {
        if (error instanceof FeedServiceError) {
          throw new TRPCError({
            code: error.code === "PROVIDER_NOT_FOUND" || error.code === "FEED_NOT_FOUND"
              ? "NOT_FOUND"
              : "BAD_REQUEST",
            message: error.message,
          })
        }

        const err = error as Error
        console.error(`Error loading feed ${feedId}:`, err)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Internal Server Error",
        })
      }
    }),
})

export type AppRouter = typeof appRouter

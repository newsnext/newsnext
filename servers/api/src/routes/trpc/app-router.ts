import type { FeedDescriptor } from "@newsnext/feeds/typings"
import { db, feedForks, feedParamConfigs, feeds, starredFeeds } from "@newsnext/database"
import { and, asc, eq } from "@newsnext/database/orm"
import { feedDescriptors } from "@newsnext/feeds/metadata"
import { FeedServiceError, loadFeed, prepareFeedRequest } from "@newsnext/feeds/service"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { protectedProcedure, publicProcedure, router } from "./core"

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

const paramsSchema = z.record(z.string(), z.unknown())

const feedForkInputSchema = z.object({
  id: z.string(),
  feedId: z.string(),
  params: paramsSchema,
  createdAt: z.number().optional(),
})

const feedParamConfigInputSchema = z.object({
  feedInstanceId: z.string(),
  feedId: z.string(),
  params: paramsSchema,
})

const saveFeedStateInputSchema = z.object({
  forks: z.array(feedForkInputSchema),
  starredFeedIds: z.array(z.string()),
  paramConfigs: z.array(feedParamConfigInputSchema),
})

const deleteFeedForkInputSchema = z.object({
  id: z.string(),
})

const setStarredFeedInputSchema = z.object({
  feedId: z.string(),
  starred: z.boolean(),
})

const deleteFeedParamConfigInputSchema = z.object({
  feedInstanceId: z.string(),
})

const updateFeedInputSchema = z.object({
  key: z.string(),
  name: z.string().min(1),
  title: z.string().optional(),
  interval: z.number().int().min(1),
  params: paramsSchema,
  color: z.string().min(1),
  desc: z.string().optional(),
  type: z.enum(["hottest", "timeline"]).optional(),
  category: z.string().min(1),
  home: z.string().optional(),
  icon: z.string().optional(),
  enabled: z.boolean(),
})

let feedCatalogSeeded = false

function getFeedDescriptorKey(feed: Pick<FeedDescriptor, "provider" | "id">): string {
  return feed.provider ? `${feed.provider}:${feed.id}` : feed.id
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined
}

function rowToFeedDescriptor(feed: typeof feeds.$inferSelect): FeedDescriptor {
  return {
    provider: feed.provider,
    id: feed.feedId,
    name: feed.name,
    title: feed.title ?? undefined,
    interval: feed.interval,
    params: feed.params as FeedDescriptor["params"],
    color: feed.color as FeedDescriptor["color"],
    desc: feed.desc ?? undefined,
    type: feed.type === "hottest" || feed.type === "timeline" ? feed.type : undefined,
    category: feed.category as FeedDescriptor["category"],
    home: feed.home ?? undefined,
    icon: feed.icon ?? undefined,
  }
}

async function ensureFeedCatalogSeeded(): Promise<void> {
  if (feedCatalogSeeded) {
    return
  }

  const existingKeys = new Set((await db.select({ key: feeds.key }).from(feeds)).map(feed => feed.key))
  const now = Date.now()
  const missingFeeds = feedDescriptors
    .filter(feed => !existingKeys.has(getFeedDescriptorKey(feed)))
    .map(feed => ({
      key: getFeedDescriptorKey(feed),
      provider: feed.provider ?? "",
      feedId: feed.id,
      name: feed.name,
      title: feed.title,
      interval: feed.interval,
      params: feed.params ?? {},
      color: feed.color,
      desc: feed.desc,
      type: feed.type,
      category: feed.category,
      home: feed.home,
      icon: feed.icon,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }))

  if (missingFeeds.length > 0) {
    await db.insert(feeds).values(missingFeeds)
  }

  feedCatalogSeeded = true
}

async function listFeedDescriptors(): Promise<FeedDescriptor[]> {
  await ensureFeedCatalogSeeded()

  const storedFeeds = await db
    .select()
    .from(feeds)
    .where(eq(feeds.enabled, true))
    .orderBy(asc(feeds.category), asc(feeds.provider), asc(feeds.feedId))

  return storedFeeds.map(rowToFeedDescriptor)
}

export const appRouter = router({
  getBoard: publicProcedure
    .input(z.object({
      boardId: z.enum(["featured", "forks", "stars"]),
      starredFeedIds: z.array(z.string()).optional(),
    }))
    .query(async ({ input }) => {
      const { boardId, starredFeedIds = [] } = input
      const feeds = await listFeedDescriptors()
      if (boardId === "stars") {
        const starredFeedIdSet = new Set(starredFeedIds)
        return feeds.filter((feed) => {
          const uniqueId = feed.provider ? `${feed.provider}:${feed.id}` : feed.id
          return starredFeedIdSet.has(uniqueId)
        })
      }
      return feeds
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

  getFeedState: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id
      const [forks, stars, paramConfigs] = await Promise.all([
        db.select().from(feedForks).where(eq(feedForks.userId, userId)),
        db.select().from(starredFeeds).where(eq(starredFeeds.userId, userId)),
        db.select().from(feedParamConfigs).where(eq(feedParamConfigs.userId, userId)),
      ])

      return {
        forks: forks.map(({ userId: _userId, updatedAt: _updatedAt, ...fork }) => fork),
        starredFeedIds: stars.map(star => star.feedId),
        paramConfigs: paramConfigs.map(({ userId: _userId, updatedAt: _updatedAt, ...config }) => config),
      }
    }),

  saveFeedState: protectedProcedure
    .input(saveFeedStateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const now = Date.now()

      await db.transaction(async (tx) => {
        await tx.delete(feedForks).where(eq(feedForks.userId, userId))
        await tx.delete(starredFeeds).where(eq(starredFeeds.userId, userId))
        await tx.delete(feedParamConfigs).where(eq(feedParamConfigs.userId, userId))

        if (input.forks.length > 0) {
          await tx.insert(feedForks).values(input.forks.map(fork => ({
            id: fork.id,
            userId,
            feedId: fork.feedId,
            params: fork.params,
            createdAt: fork.createdAt ?? now,
            updatedAt: now,
          })))
        }

        if (input.starredFeedIds.length > 0) {
          await tx.insert(starredFeeds).values(input.starredFeedIds.map(feedId => ({
            userId,
            feedId,
            createdAt: now,
          })))
        }

        if (input.paramConfigs.length > 0) {
          await tx.insert(feedParamConfigs).values(input.paramConfigs.map(config => ({
            userId,
            feedInstanceId: config.feedInstanceId,
            feedId: config.feedId,
            params: config.params,
            updatedAt: now,
          })))
        }
      })

      return { ok: true }
    }),

  upsertFeedFork: protectedProcedure
    .input(feedForkInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const now = Date.now()

      await db.insert(feedForks).values({
        id: input.id,
        userId,
        feedId: input.feedId,
        params: input.params,
        createdAt: input.createdAt ?? now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [feedForks.userId, feedForks.id],
        set: {
          feedId: input.feedId,
          params: input.params,
          updatedAt: now,
        },
      })

      return { ok: true }
    }),

  deleteFeedFork: protectedProcedure
    .input(deleteFeedForkInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id

      await db.delete(feedForks).where(and(eq(feedForks.userId, userId), eq(feedForks.id, input.id)))

      return { ok: true }
    }),

  setStarredFeed: protectedProcedure
    .input(setStarredFeedInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id

      if (!input.starred) {
        await db.delete(starredFeeds).where(and(eq(starredFeeds.userId, userId), eq(starredFeeds.feedId, input.feedId)))
        return { ok: true }
      }

      await db.insert(starredFeeds).values({
        userId,
        feedId: input.feedId,
        createdAt: Date.now(),
      }).onConflictDoNothing()

      return { ok: true }
    }),

  saveFeedParamConfig: protectedProcedure
    .input(feedParamConfigInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const now = Date.now()

      await db.insert(feedParamConfigs).values({
        userId,
        feedInstanceId: input.feedInstanceId,
        feedId: input.feedId,
        params: input.params,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [feedParamConfigs.userId, feedParamConfigs.feedInstanceId],
        set: {
          feedId: input.feedId,
          params: input.params,
          updatedAt: now,
        },
      })

      return { ok: true }
    }),

  deleteFeedParamConfig: protectedProcedure
    .input(deleteFeedParamConfigInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id

      await db.delete(feedParamConfigs).where(and(eq(feedParamConfigs.userId, userId), eq(feedParamConfigs.feedInstanceId, input.feedInstanceId)))

      return { ok: true }
    }),

  getAdminFeeds: protectedProcedure
    .query(async () => {
      await ensureFeedCatalogSeeded()

      return db
        .select()
        .from(feeds)
        .orderBy(asc(feeds.category), asc(feeds.provider), asc(feeds.feedId))
    }),

  updateAdminFeed: protectedProcedure
    .input(updateFeedInputSchema)
    .mutation(async ({ input }) => {
      const now = Date.now()

      await db.update(feeds)
        .set({
          name: input.name,
          title: normalizeOptionalText(input.title),
          interval: input.interval,
          params: input.params,
          color: input.color,
          desc: normalizeOptionalText(input.desc),
          type: input.type,
          category: input.category,
          home: normalizeOptionalText(input.home),
          icon: normalizeOptionalText(input.icon),
          enabled: input.enabled,
          updatedAt: now,
        })
        .where(eq(feeds.key, input.key))

      return { ok: true }
    }),
})

export type AppRouter = typeof appRouter

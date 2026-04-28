import type { FeedDescriptor } from "@newsnext/feeds/typings"
import { db, feeds, starredFeedInstances, userFeedInstances } from "@newsnext/database"
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

const feedInstanceInputSchema = z.object({
  instanceId: z.string(),
  feedKey: z.string(),
  params: paramsSchema,
  isFork: z.boolean(),
  createdAt: z.number().optional(),
})

const saveFeedStateInputSchema = z.object({
  feedInstances: z.array(feedInstanceInputSchema),
  starredFeedInstanceIds: z.array(z.string()),
})

const feedInstanceIdInputSchema = z.object({
  instanceId: z.string(),
})

const setStarredFeedInstanceInputSchema = z.object({
  instanceId: z.string(),
  starred: z.boolean(),
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
    .query(async () => {
      const feeds = await listFeedDescriptors()
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
      const [instances, stars] = await Promise.all([
        db.select().from(userFeedInstances).where(eq(userFeedInstances.userId, userId)),
        db.select().from(starredFeedInstances).where(eq(starredFeedInstances.userId, userId)),
      ])

      return {
        feedInstances: instances.map(instance => ({
          instanceId: instance.instanceId,
          feedKey: instance.feedKey,
          params: instance.params,
          isFork: instance.isFork,
          createdAt: instance.createdAt,
        })),
        starredFeedInstanceIds: stars.map(star => star.instanceId),
      }
    }),

  saveFeedState: protectedProcedure
    .input(saveFeedStateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const now = Date.now()
      await ensureFeedCatalogSeeded()

      await db.transaction(async (tx) => {
        await tx.delete(userFeedInstances).where(eq(userFeedInstances.userId, userId))
        await tx.delete(starredFeedInstances).where(eq(starredFeedInstances.userId, userId))

        if (input.feedInstances.length > 0) {
          await tx.insert(userFeedInstances).values(input.feedInstances.map(instance => ({
            userId,
            instanceId: instance.instanceId,
            feedKey: instance.feedKey,
            params: instance.params,
            isFork: instance.isFork,
            createdAt: instance.createdAt ?? now,
            updatedAt: now,
          })))
        }

        if (input.starredFeedInstanceIds.length > 0) {
          await tx.insert(starredFeedInstances).values(input.starredFeedInstanceIds.map(instanceId => ({
            userId,
            instanceId,
            createdAt: now,
          })))
        }
      })

      return { ok: true }
    }),

  upsertFeedInstance: protectedProcedure
    .input(feedInstanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const now = Date.now()
      await ensureFeedCatalogSeeded()

      await db.insert(userFeedInstances).values({
        userId,
        instanceId: input.instanceId,
        feedKey: input.feedKey,
        params: input.params,
        isFork: input.isFork,
        createdAt: input.createdAt ?? now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [userFeedInstances.userId, userFeedInstances.instanceId],
        set: {
          feedKey: input.feedKey,
          params: input.params,
          isFork: input.isFork,
          updatedAt: now,
        },
      })

      return { ok: true }
    }),

  deleteFeedInstance: protectedProcedure
    .input(feedInstanceIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id

      await Promise.all([
        db.delete(userFeedInstances).where(and(eq(userFeedInstances.userId, userId), eq(userFeedInstances.instanceId, input.instanceId))),
        db.delete(starredFeedInstances).where(and(eq(starredFeedInstances.userId, userId), eq(starredFeedInstances.instanceId, input.instanceId))),
      ])

      return { ok: true }
    }),

  setStarredFeedInstance: protectedProcedure
    .input(setStarredFeedInstanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id

      if (!input.starred) {
        await db.delete(starredFeedInstances).where(and(eq(starredFeedInstances.userId, userId), eq(starredFeedInstances.instanceId, input.instanceId)))
        return { ok: true }
      }

      await db.insert(starredFeedInstances).values({
        userId,
        instanceId: input.instanceId,
        createdAt: Date.now(),
      }).onConflictDoNothing()

      return { ok: true }
    }),

  resetFeedInstanceParams: protectedProcedure
    .input(feedInstanceIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const [instance] = await db
        .select()
        .from(userFeedInstances)
        .where(and(eq(userFeedInstances.userId, userId), eq(userFeedInstances.instanceId, input.instanceId)))
        .limit(1)

      if (instance?.isFork) {
        await db.update(userFeedInstances)
          .set({
            params: {},
            updatedAt: Date.now(),
          })
          .where(and(eq(userFeedInstances.userId, userId), eq(userFeedInstances.instanceId, input.instanceId)))
      } else {
        await db.delete(userFeedInstances).where(and(eq(userFeedInstances.userId, userId), eq(userFeedInstances.instanceId, input.instanceId)))
      }

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

import type { SourceDescriptor } from "@newsnext/sources/typings"
import { db, starredSourceInstances, userSourceInstances } from "@newsnext/database"
import { and, eq } from "@newsnext/database/orm"
import { SourceServiceError } from "@newsnext/instance"
import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { protectedProcedure, publicProcedure, router } from "./core"

const getSourceInputSchema = z.object({
  sourceId: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  latest: z.boolean().optional(),
})

const paramsSchema = z.record(z.string(), z.unknown())

const sourceInstanceInputSchema = z.object({
  instanceId: z.string(),
  sourceKey: z.string(),
  params: paramsSchema,
  isFork: z.boolean(),
  createdAt: z.number().optional(),
})

const saveSourceStateInputSchema = z.object({
  sourceInstances: z.array(sourceInstanceInputSchema),
  starredSourceInstanceIds: z.array(z.string()),
})

const sourceInstanceIdInputSchema = z.object({
  instanceId: z.string(),
})

const setStarredSourceInstanceInputSchema = z.object({
  instanceId: z.string(),
  starred: z.boolean(),
})

type AdminSource = SourceDescriptor & {
  key: string
  sourceId: string
  enabled: boolean
  createdAt: number
  updatedAt: number
}

function getSourceDescriptorKey(source: Pick<SourceDescriptor, "provider" | "id">): string {
  return source.provider ? `${source.provider}:${source.id}` : source.id
}

function toAdminSource(source: SourceDescriptor): AdminSource {
  const key = getSourceDescriptorKey(source)
  return {
    ...source,
    key,
    sourceId: source.id,
    enabled: true,
    createdAt: 0,
    updatedAt: 0,
  }
}

export const appRouter = router({
  getBoard: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.instance.listSourceDescriptors()
    }),

  getSource: publicProcedure
    .input(getSourceInputSchema)
    .query(async ({ input, ctx }) => {
      const { sourceId, params = {}, latest } = input
      try {
        return await ctx.instance.loadSource({
          sourceId,
          params,
          latest,
          waitUntil: ctx.waitUntil,
        })
      } catch (error) {
        if (error instanceof SourceServiceError) {
          throw new TRPCError({
            code: error.code === "PROVIDER_NOT_FOUND" || error.code === "SOURCE_NOT_FOUND"
              ? "NOT_FOUND"
              : "BAD_REQUEST",
            message: error.message,
          })
        }

        const err = error as Error
        console.error(`Error loading source ${sourceId}:`, err)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "Internal Server Error",
        })
      }
    }),

  getSourceState: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id
      const [instances, stars] = await Promise.all([
        db.select().from(userSourceInstances).where(eq(userSourceInstances.userId, userId)),
        db.select().from(starredSourceInstances).where(eq(starredSourceInstances.userId, userId)),
      ])

      return {
        sourceInstances: instances.map(instance => ({
          instanceId: instance.instanceId,
          sourceKey: instance.sourceKey,
          params: instance.params,
          isFork: instance.isFork,
          createdAt: instance.createdAt,
        })),
        starredSourceInstanceIds: stars.map(star => star.instanceId),
      }
    }),

  saveSourceState: protectedProcedure
    .input(saveSourceStateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const now = Date.now()

      await db.transaction(async (tx) => {
        await tx.delete(userSourceInstances).where(eq(userSourceInstances.userId, userId))
        await tx.delete(starredSourceInstances).where(eq(starredSourceInstances.userId, userId))

        if (input.sourceInstances.length > 0) {
          await tx.insert(userSourceInstances).values(input.sourceInstances.map(instance => ({
            userId,
            instanceId: instance.instanceId,
            sourceKey: instance.sourceKey,
            params: instance.params,
            isFork: instance.isFork,
            createdAt: instance.createdAt ?? now,
            updatedAt: now,
          })))
        }

        if (input.starredSourceInstanceIds.length > 0) {
          await tx.insert(starredSourceInstances).values(input.starredSourceInstanceIds.map(instanceId => ({
            userId,
            instanceId,
            createdAt: now,
          })))
        }
      })

      return { ok: true }
    }),

  upsertSourceInstance: protectedProcedure
    .input(sourceInstanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const now = Date.now()

      await db.insert(userSourceInstances).values({
        userId,
        instanceId: input.instanceId,
        sourceKey: input.sourceKey,
        params: input.params,
        isFork: input.isFork,
        createdAt: input.createdAt ?? now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [userSourceInstances.userId, userSourceInstances.instanceId],
        set: {
          sourceKey: input.sourceKey,
          params: input.params,
          isFork: input.isFork,
          updatedAt: now,
        },
      })

      return { ok: true }
    }),

  deleteSourceInstance: protectedProcedure
    .input(sourceInstanceIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id

      await Promise.all([
        db.delete(userSourceInstances).where(and(eq(userSourceInstances.userId, userId), eq(userSourceInstances.instanceId, input.instanceId))),
        db.delete(starredSourceInstances).where(and(eq(starredSourceInstances.userId, userId), eq(starredSourceInstances.instanceId, input.instanceId))),
      ])

      return { ok: true }
    }),

  setStarredSourceInstance: protectedProcedure
    .input(setStarredSourceInstanceInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id

      if (!input.starred) {
        await db.delete(starredSourceInstances).where(and(eq(starredSourceInstances.userId, userId), eq(starredSourceInstances.instanceId, input.instanceId)))
        return { ok: true }
      }

      await db.insert(starredSourceInstances).values({
        userId,
        instanceId: input.instanceId,
        createdAt: Date.now(),
      }).onConflictDoNothing()

      return { ok: true }
    }),

  resetSourceInstanceParams: protectedProcedure
    .input(sourceInstanceIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id
      const [instance] = await db
        .select()
        .from(userSourceInstances)
        .where(and(eq(userSourceInstances.userId, userId), eq(userSourceInstances.instanceId, input.instanceId)))
        .limit(1)

      if (instance?.isFork) {
        await db.update(userSourceInstances)
          .set({
            params: {},
            updatedAt: Date.now(),
          })
          .where(and(eq(userSourceInstances.userId, userId), eq(userSourceInstances.instanceId, input.instanceId)))
      } else {
        await db.delete(userSourceInstances).where(and(eq(userSourceInstances.userId, userId), eq(userSourceInstances.instanceId, input.instanceId)))
      }

      return { ok: true }
    }),

  getAdminSources: protectedProcedure
    .query(async ({ ctx }) => {
      return (await ctx.instance.listSourceDescriptors()).map(toAdminSource)
    }),

  updateAdminSource: protectedProcedure
    .input(z.unknown())
    .mutation(() => {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Source metadata is defined in code and is not stored in the database.",
      })
    }),
})

export type AppRouter = typeof appRouter

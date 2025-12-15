import { trpcServer } from "@hono/trpc-server"
import { cache, db } from "@newsnext/database"
import { eq } from "@newsnext/database/orm"
import { sources } from "@newsnext/sources"
import { metadata } from "@newsnext/sources/metadata"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { appRouter } from "./app-router"

const TTL = 30 * 60 * 1000 // 30 minutes

export type { AppRouter } from "./app-router"

const app = new Hono()

app.use(logger())
app.use("/*", cors())

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
  }),
)

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

function success<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  }
}

function error(code: string, message: string, data: any = null): ApiResponse<any> {
  return {
    success: false,
    data,
    error: {
      code,
      message,
    },
  }
}

app.get("/", (c) => {
  return c.json(success("Hello Hono!"))
})

app.get("/boards/:boardId", (c) => {
  // hottest or timeline
  const boardId = c.req.param("boardId")
  if (!["hottest", "timeline", "realtime"].includes(boardId)) {
    return c.json(error("BOARD_NOT_FOUND", `Board '${boardId}' not found`))
  }

  if (boardId === "hottest") {
    const board = metadata.filter(m => m.type === "hottest")
    return c.json(success(board))
  } else {
    const timeline = metadata.filter(m => m.type !== "hottest")
    if (boardId === "timeline") {
      return c.json(success(timeline))
    } else {
      return c.json(success(timeline.filter(m => m.interval <= 2 * 60 * 1000)))
    }
  }
})

app.get("/sources", async (c) => {
  return c.json(success(metadata))
})

app.get("/sources/:sourceId", async (c) => {
  const sourceId = c.req.param("sourceId")

  // Expect sourceId to be "group:id"
  const [namespace, id = "default"] = sourceId.split(":")

  if (!namespace || !id) {
    return c.json(error("INVALID_FORMAT", "Invalid source ID format. Expected 'group:id'"))
  }

  const sourceGroup = sources[namespace as keyof typeof sources]
  if (!sourceGroup) {
    return c.json(error("GROUP_NOT_FOUND", `Source group '${namespace}' not found`))
  }

  const source = sourceGroup[id]
  if (!source) {
    return c.json(error("SOURCE_NOT_FOUND", `Source '${id}' not found in group '${namespace}'`))
  }

  if (!source.fetcher) {
    return c.json(error("NO_FETCHER", "Source does not have a fetcher"))
  }

  // Parse and validate parameters
  const params: Record<string, any> = {}
  const query = c.req.query()

  if (source.params) {
    for (const [key, config] of Object.entries(source.params)) {
      const val = query[key]
      if (val !== undefined) {
        switch (config.type) {
          case "number":
            params[key] = Number(val)
            break
          case "switch":
            params[key] = val === "true" || val === "1"
            break
          default:
            params[key] = val
        }
      } else {
        params[key] = config.default
      }
    }
  }

  // Cache Logic
  const meta = metadata.find(m => m.namespace === namespace && m.id === id)
  const interval = meta?.interval ?? 10 * 60 * 1000
  const isLatest = query.latest === "true" || query.latest === "1"
  const now = Date.now()

  let cached: typeof cache.$inferSelect | undefined
  try {
    const result = await db.query.cache.findFirst({
      where: eq(cache.key, sourceId),
    })
    cached = result
  } catch (e) {
    console.error("Cache read error:", e)
  }

  if (cached) {
    const updated = new Date(cached.updatedAt).getTime()
    // 1. Fresh cache
    if (now - updated < interval) {
      return c.json(success({
        id: sourceId,
        updated,
        items: JSON.parse(cached.value),
        status: "success", // Considered fresh
      }))
    }
    // 2. Stale but valid within TTL (if not forced refresh)
    if (now - updated < TTL) {
      if (!isLatest) {
        return c.json(success({
          id: sourceId,
          updated,
          items: JSON.parse(cached.value),
          status: "cache",
        }))
      }
    }
  }

  try {
    const items = await source.fetcher(params)

    // Update cache
    const value = JSON.stringify(items)
    await db.insert(cache).values({
      key: sourceId,
      value,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).onConflictDoUpdate({
      target: cache.key,
      set: {
        value,
        updatedAt: Date.now(),
      },
    })

    return c.json(success({
      id: sourceId,
      updated: Date.now(),
      items,
      status: "success",
    }))
  } catch (err: any) {
    if (cached) {
      return c.json(success({
        id: sourceId,
        updated: new Date(cached.updatedAt).getTime(),
        items: JSON.parse(cached.value),
        status: "cache",
      }))
    }
    console.error(`Error executing source ${sourceId}:`, err)
    return c.json(error("INTERNAL_ERROR", err.message || "Internal Server Error"))
  }
})

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}

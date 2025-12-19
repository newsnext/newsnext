import type { CacheAdapter } from "@newsnext/cache"
import type { ApiResponse } from "@newsnext/shared/types"
import { trpcServer } from "@hono/trpc-server"
import { getCachedSource } from "@newsnext/cache"
import { sources } from "@newsnext/sources"
import { metadata } from "@newsnext/sources/metadata"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { appRouter } from "./app-router"

export type { AppRouter } from "./app-router"

interface Variables {
  adapter: CacheAdapter
}

const app = new Hono<{ Bindings: CloudflareBindings, Variables: Variables }>()

let adapter: CacheAdapter

app.use(logger())
app.use("/*", cors())

app.use("*", async (c, next) => {
  if (!adapter) {
    if (c.env.CACHE_DB) {
      try {
        const { D1CacheAdapter } = await import("@newsnext/cache/d1")
        adapter = new D1CacheAdapter(c.env.CACHE_DB)
        console.log("Using D1 cache adapter")
      } catch (e) {
        console.error("Failed to initialize D1 cache adapter:", e)
      }
    }

    if (!adapter) {
      const { MemoryCacheAdapter } = await import("@newsnext/cache/memory")
      adapter = new MemoryCacheAdapter()
      console.log("Using Memory cache adapter")
    }
  }
  c.set("adapter", adapter)
  await next()
})

app.use("/trpc/*", (c, next) => {
  return trpcServer({
    router: appRouter,
    createContext: () => ({
      adapter: c.var.adapter,
      waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
    }),
  })(c, next)
})

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

  const isLatest = query.latest === "true" || query.latest === "1"

  try {
    const result = await getCachedSource({
      key: sourceId,
      fetcher: () => source.fetcher(params),
      forceRefresh: isLatest,
      waitUntil: (p: Promise<any>) => c.executionCtx.waitUntil(p),
    }, c.var.adapter)

    return c.json(success({
      id: sourceId,
      ...result,
    }))
  } catch (err: any) {
    console.error(`Error executing source ${sourceId}:`, err)
    return c.json(error("INTERNAL_ERROR", err.message || "Internal Server Error"))
  }
})

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}

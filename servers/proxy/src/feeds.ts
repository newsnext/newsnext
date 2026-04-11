import type { CacheAdapter } from "@newsnext/cache"
import { feedDescriptors } from "@newsnext/feeds/metadata"
import { FeedServiceError, loadFeed, prepareFeedRequest } from "@newsnext/feeds/service"
import { Hono } from "hono"
import { error, success } from "./utils"

export default function createFeedsRoute(adapter: CacheAdapter) {
  const app = new Hono()

  app.get("/", async (c) => {
    return c.json(success(feedDescriptors))
  })

  app.get("/:feedId", async (c) => {
    const feedId = c.req.param("feedId")

    try {
      const prepared = prepareFeedRequest(feedId, c.req.query())
      const result = await loadFeed({
        feedId,
        params: prepared.params as Record<string, unknown>,
        paramsAreNormalized: true,
        adapter,
      })

      return c.json(success({
        status: result.status,
        updated: result.updated,
        items: result.items,
      }))
    } catch (error_) {
      if (error_ instanceof FeedServiceError) {
        return c.json(error(error_.code, error_.message))
      }

      const err = error_ as Error
      console.error(`Error loading feed ${feedId}:`, err)
      return c.json(error("INTERNAL_ERROR", err.message || "Internal Server Error"))
    }
  })

  return app
}

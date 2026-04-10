import type { CacheAdapter } from "@newsnext/cache"
import { metadata } from "@newsnext/sources/metadata"
import { executeSource, SourceServiceError } from "@newsnext/sources/service"
import { Hono } from "hono"
import { error, success } from "./utils"

export default function createSourcesRoute(adapter: CacheAdapter) {
  const app = new Hono()

  app.get("/", async (c) => {
    return c.json(success(metadata))
  })

  app.get("/:sourceId", async (c) => {
    const sourceId = c.req.param("sourceId")

    try {
      const result = await executeSource({
        sourceId,
        params: c.req.query(),
        adapter,
      })

      return c.json(success({
        status: result.status,
        updated: result.updated,
        items: result.items,
      }))
    } catch (error_) {
      if (error_ instanceof SourceServiceError) {
        return c.json(error(error_.code, error_.message))
      }

      const err = error_ as Error
      console.error(`Error executing source ${sourceId}:`, err)
      return c.json(error("INTERNAL_ERROR", err.message || "Internal Server Error"))
    }
  })

  return app
}

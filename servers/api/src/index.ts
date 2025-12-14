import { sources } from "@newsnext/sources"
import { Hono } from "hono"
import { logger } from "hono/logger"

const app = new Hono()

app.use(logger())

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

app.get("/boards/:boardId", (c) => {
  const boardId = c.req.param("boardId")
  return c.text(`Hello Hono! ${boardId}`)
})

app.get("/sources", async (c) => {
  return c.json(sources)
})
app.get("/sources/:sourceId", async (c) => {
  const sourceId = c.req.param("sourceId")

  // Expect sourceId to be "group:id"
  const [group, id = "default"] = sourceId.split(":")

  if (!group || !id) {
    return c.json({ error: "Invalid source ID format. Expected 'group:id'" }, 400)
  }

  const sourceGroup = sources[group as keyof typeof sources]
  if (!sourceGroup) {
    return c.json({ error: `Source group '${group}' not found` }, 404)
  }

  const source = sourceGroup[id]
  if (!source) {
    return c.json({ error: `Source '${id}' not found in group '${group}'` }, 404)
  }

  if (!source.fetcher) {
    return c.json({ error: "Source does not have a fetcher" }, 400)
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

  try {
    const items = await source.fetcher(params)
    return c.json({
      id: sourceId,
      updated: Date.now(),
      items,
    })
  } catch (error: any) {
    console.error(`Error executing source ${sourceId}:`, error)
    return c.json({ error: error.message || "Internal Server Error" }, 500)
  }
})

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}

import { sources } from "@newsnext/sources"
import { metadata } from "@newsnext/sources/metadata"
import { Hono } from "hono"
import { error, success } from "./utils"

const app = new Hono()

app.get("/", async (c) => {
  return c.json(success(metadata))
})

app.get("/:sourceId", async (c) => {
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

  try {
    const result = await source.fetcher(params)

    return c.json(success({
      items: result,
    }))
  } catch (err: any) {
    console.error(`Error executing source ${sourceId}:`, err)
    return c.json(error("INTERNAL_ERROR", err.message || "Internal Server Error"))
  }
})

export default app

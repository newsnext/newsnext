import { sources } from "@newsnext/sources"
import { metadata } from "@newsnext/sources/metadata"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

const app = new Hono()

app.use(logger())
app.use("/*", cors())

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

export default {
  port: process.env.PORT ?? 4000,
  fetch: app.fetch,
}

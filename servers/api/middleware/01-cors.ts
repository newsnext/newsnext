import { defineMiddleware } from "nitro"
import { handleCors } from "nitro/h3"

export default defineMiddleware((event) => {
  const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)

  const corsResponse = handleCors(event, {
    credentials: true,
    origin: (origin: string) => trustedOrigins.length === 0 || trustedOrigins.includes(origin),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["authorization", "content-type", "x-trpc-source"],
    exposeHeaders: [],
    preflight: {
      statusCode: 204,
    },
  })

  if (corsResponse !== false) {
    return corsResponse
  }
})

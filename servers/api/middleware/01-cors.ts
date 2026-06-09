import { defineMiddleware } from "nitro"
import { handleCors } from "nitro/h3"
import { getNitroCloudflareEnv, getNitroCloudflareEnvValue } from "@/cloudflare-bindings"

export const CORS_ALLOW_HEADERS = ["authorization", "content-type", "trpc-accept", "x-orpc-batch", "x-trpc-source"]

export default defineMiddleware((event) => {
  const env = getNitroCloudflareEnv(event)
  const trustedOrigins = (
    getNitroCloudflareEnvValue(env, "BETTER_AUTH_TRUSTED_ORIGINS")
    ?? process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ?? ""
  )
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)

  const corsResponse = handleCors(event, {
    credentials: true,
    origin: (origin: string) => trustedOrigins.length === 0 || trustedOrigins.includes(origin),
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: CORS_ALLOW_HEADERS,
    exposeHeaders: [],
    preflight: {
      statusCode: 204,
    },
  })

  if (corsResponse !== false) {
    return corsResponse
  }
})

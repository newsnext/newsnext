import type { ApiCloudflareBindings } from "../cloudflare-bindings"
import { createD1Db } from "@newsnext/database/d1"
import * as schema from "@newsnext/database/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

let cloudflareAuthPromise: ReturnType<typeof createAuth> | undefined

function getEnv(name: string): string | undefined {
  return process.env[name] || undefined
}

function getTrustedOrigins(): string[] {
  return (getEnv("BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
}

const githubClientId = getEnv("GITHUB_CLIENT_ID")
const githubClientSecret = getEnv("GITHUB_CLIENT_SECRET")
const googleClientId = getEnv("GOOGLE_CLIENT_ID")
const googleClientSecret = getEnv("GOOGLE_CLIENT_SECRET")

export function getAuth(bindings?: Pick<ApiCloudflareBindings, "DATA_DB">): ReturnType<typeof createAuth> {
  if (!bindings?.DATA_DB) {
    throw new Error("DATA_DB binding is required for NewsNext API auth")
  }

  cloudflareAuthPromise ??= createAuth(bindings.DATA_DB)
  return cloudflareAuthPromise
}

async function createAuth(d1: unknown) {
  const db = createD1Db(d1)
  return betterAuth({
    baseURL: getEnv("BETTER_AUTH_URL"),
    secret: getEnv("BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: getTrustedOrigins(),
    socialProviders: {
      ...(githubClientId && githubClientSecret
        ? {
            github: {
              clientId: githubClientId,
              clientSecret: githubClientSecret,
            },
          }
        : {}),
      ...(googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : {}),
    },
  })
}

import type { ApiCloudflareBindings } from "../cloudflare-bindings"
import { createD1Db } from "@newsnext/database/d1"
import * as schema from "@newsnext/database/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getNitroCloudflareEnvValue } from "../cloudflare-bindings"

let cloudflareAuthPromise: ReturnType<typeof createAuth> | undefined

function getEnv(bindings: ApiCloudflareBindings, name: keyof ApiCloudflareBindings): string | undefined {
  return getNitroCloudflareEnvValue(bindings, name) ?? process.env[name]
}

function getTrustedOrigins(bindings: ApiCloudflareBindings): string[] {
  return (getEnv(bindings, "BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
}

export function getAuth(bindings?: ApiCloudflareBindings): ReturnType<typeof createAuth> {
  if (!bindings?.DATA_DB) {
    throw new Error("DATA_DB binding is required for NewsNext API auth")
  }

  cloudflareAuthPromise ??= createAuth(bindings)
  return cloudflareAuthPromise
}

async function createAuth(bindings: ApiCloudflareBindings) {
  const githubClientId = getEnv(bindings, "GITHUB_CLIENT_ID")
  const githubClientSecret = getEnv(bindings, "GITHUB_CLIENT_SECRET")
  const googleClientId = getEnv(bindings, "GOOGLE_CLIENT_ID")
  const googleClientSecret = getEnv(bindings, "GOOGLE_CLIENT_SECRET")

  const db = createD1Db(bindings.DATA_DB)
  return betterAuth({
    baseURL: getEnv(bindings, "BETTER_AUTH_URL"),
    secret: getEnv(bindings, "BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: getTrustedOrigins(bindings),
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

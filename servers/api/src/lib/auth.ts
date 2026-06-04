import type { ApiCloudflareBindings } from "../cloudflare-bindings"
import * as schema from "@newsnext/database/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { memoryAdapter } from "better-auth/adapters/memory"
import { getNitroCloudflareEnvValue } from "../cloudflare-bindings"
import { isLocalApiRuntime } from "../runtime"

let cloudflareAuthPromise: ReturnType<typeof createAuth> | undefined
let localAuthPromise: ReturnType<typeof createLocalAuth> | undefined

function getEnv(bindings: ApiCloudflareBindings | undefined, name: keyof ApiCloudflareBindings): string | undefined {
  return getNitroCloudflareEnvValue(bindings, name) ?? process.env[name]
}

function getTrustedOrigins(bindings: ApiCloudflareBindings | undefined): string[] {
  return (getEnv(bindings, "BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
}

export function getAuth(bindings?: ApiCloudflareBindings): ReturnType<typeof createAuth> | ReturnType<typeof createLocalAuth> {
  if (isLocalApiRuntime()) {
    localAuthPromise ??= createLocalAuth()
    return localAuthPromise
  }

  cloudflareAuthPromise ??= createAuth(bindings)
  return cloudflareAuthPromise
}

async function createLocalAuth() {
  const database = "Bun" in globalThis
    ? drizzleAdapter(await getLocalAuthDatabase(), {
        provider: "sqlite",
        schema,
      })
    : memoryAdapter({})

  return betterAuth({
    baseURL: getEnv(undefined, "BETTER_AUTH_URL"),
    secret: getEnv(undefined, "BETTER_AUTH_SECRET"),
    database,
    trustedOrigins: getTrustedOrigins(undefined),
  })
}

async function getLocalAuthDatabase() {
  const { getApiDatabase } = await import("../local-database")
  return getApiDatabase()
}

async function createAuth(bindings?: ApiCloudflareBindings) {
  const githubClientId = getEnv(bindings, "GITHUB_CLIENT_ID")
  const githubClientSecret = getEnv(bindings, "GITHUB_CLIENT_SECRET")
  const googleClientId = getEnv(bindings, "GOOGLE_CLIENT_ID")
  const googleClientSecret = getEnv(bindings, "GOOGLE_CLIENT_SECRET")

  const { getApiDatabase } = await import("../local-database")
  const db = await getApiDatabase()
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

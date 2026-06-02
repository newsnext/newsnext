import { createD1Db, getDb } from "@newsnext/database"
import * as schema from "@newsnext/database/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

let localAuthPromise: ReturnType<typeof createAuth> | undefined
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

export function getAuth(bindings?: Pick<CloudflareBindings, "DATA_DB">): ReturnType<typeof createAuth> {
  if (bindings?.DATA_DB) {
    cloudflareAuthPromise ??= createAuth(bindings.DATA_DB)
    return cloudflareAuthPromise
  }

  localAuthPromise ??= createAuth()
  return localAuthPromise
}

async function createAuth(d1?: unknown) {
  const db = d1 ? createD1Db(d1) : await getDb()
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

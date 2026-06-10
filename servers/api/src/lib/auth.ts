import type { ApiCloudflareBindings } from "../cloudflare-bindings"
import * as schema from "@newsnext/database/schema"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { memoryAdapter } from "better-auth/adapters/memory"
import { getNitroCloudflareEnvValue } from "../cloudflare-bindings"
import { isLocalApiRuntime } from "../runtime"

let cloudflareAuthPromise: ReturnType<typeof createAuth> | undefined
let localAuthPromise: ReturnType<typeof createLocalAuth> | undefined
const AUTH_BASE_PATH = "/v1/auth"

function getEnv(bindings: ApiCloudflareBindings | undefined, name: keyof ApiCloudflareBindings): string | undefined {
  return getNitroCloudflareEnvValue(bindings, name) ?? process.env[name]
}

function getTrustedOrigins(bindings: ApiCloudflareBindings | undefined): string[] {
  return (getEnv(bindings, "BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
}

function hasCloudflareDatabaseBinding(bindings: ApiCloudflareBindings | undefined): boolean {
  return Boolean(bindings?.DB)
}

function getProviderCallbackUrl(bindings: ApiCloudflareBindings | undefined, provider: "github" | "google"): string | undefined {
  const authBaseUrl = getEnv(bindings, "BETTER_AUTH_URL")?.replace(/\/+$/, "")

  if (!authBaseUrl) {
    return undefined
  }

  return `${authBaseUrl}${AUTH_BASE_PATH}/callback/${provider}`
}

function getSocialProviders(bindings: ApiCloudflareBindings | undefined) {
  const githubClientId = getEnv(bindings, "GITHUB_CLIENT_ID")
  const githubClientSecret = getEnv(bindings, "GITHUB_CLIENT_SECRET")
  const googleClientId = getEnv(bindings, "GOOGLE_CLIENT_ID")
  const googleClientSecret = getEnv(bindings, "GOOGLE_CLIENT_SECRET")
  const githubRedirectURI = getProviderCallbackUrl(bindings, "github")
  const googleRedirectURI = getProviderCallbackUrl(bindings, "google")

  return {
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            ...(githubRedirectURI ? { redirectURI: githubRedirectURI } : {}),
          },
        }
      : {}),
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            ...(googleRedirectURI ? { redirectURI: googleRedirectURI } : {}),
          },
        }
      : {}),
  }
}

export function getAuth(bindings?: ApiCloudflareBindings): ReturnType<typeof createAuth> | ReturnType<typeof createLocalAuth> {
  if (!hasCloudflareDatabaseBinding(bindings) && isLocalApiRuntime()) {
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
    basePath: AUTH_BASE_PATH,
    secret: getEnv(undefined, "BETTER_AUTH_SECRET"),
    database,
    trustedOrigins: getTrustedOrigins(undefined),
    socialProviders: getSocialProviders(undefined),
  })
}

async function getLocalAuthDatabase() {
  const { getApiDatabase } = await import("../local-database")
  return getApiDatabase()
}

async function createAuth(bindings?: ApiCloudflareBindings) {
  const { getApiDatabase } = await import("../local-database")
  const db = await getApiDatabase()
  return betterAuth({
    baseURL: getEnv(bindings, "BETTER_AUTH_URL"),
    basePath: AUTH_BASE_PATH,
    secret: getEnv(bindings, "BETTER_AUTH_SECRET"),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    trustedOrigins: getTrustedOrigins(bindings),
    socialProviders: getSocialProviders(bindings),
  })
}

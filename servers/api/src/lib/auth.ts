import * as schema from "@newsnext/database"
import { db } from "@newsnext/database"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

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

export const auth = betterAuth({
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
  },
})

import { createAuthClient } from "better-auth/react"
import { getAppURL } from "@/lib/env"

export type AuthProviderId = "github" | "google"

function getAuthRedirectURL(): string {
  return window.location.href
}

export const authClient = createAuthClient({
  baseURL: getAppURL("/"),
  basePath: "/v1/auth",
})

export async function signInWithProvider(provider: AuthProviderId): Promise<{ error: string | null }> {
  const redirectURL = getAuthRedirectURL()
  const { error } = await authClient.signIn.social({
    provider,
    callbackURL: redirectURL,
    errorCallbackURL: redirectURL,
  })

  return {
    error: error?.message || null,
  }
}

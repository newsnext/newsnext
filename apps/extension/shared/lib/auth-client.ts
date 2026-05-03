import { createAuthClient } from "better-auth/react"
import { BASE_URL, getAppURL } from "@/lib/env"

export type AuthProviderId = "github" | "google"

function getAuthRedirectURL(): string {
  if (globalThis.location?.protocol === "chrome-extension:") {
    return BASE_URL || getAppURL("/api/auth")
  }

  return window.location.href
}

export const authClient = createAuthClient({
  baseURL: getAppURL("/api/auth"),
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

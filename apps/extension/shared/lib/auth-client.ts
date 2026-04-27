import { createAuthClient } from "better-auth/react"
import { BASE_URL } from "@/lib/env"

export type AuthProviderId = "github" | "google"

function getAuthBaseURL(): string {
  if (BASE_URL) {
    return `${BASE_URL}/api/auth`
  }

  return `${window.location.origin}/api/auth`
}

function getAuthRedirectURL(): string {
  if (globalThis.location?.protocol === "chrome-extension:") {
    return BASE_URL || getAuthBaseURL()
  }

  return window.location.href
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
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

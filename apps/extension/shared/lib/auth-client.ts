import { createAuthClient } from "better-auth/react"
import { BASE_URL } from "@/lib/env"

export type AuthProviderId = "github" | "google"

function getAuthBaseURL(): string {
  if (BASE_URL) {
    return `${BASE_URL}/api/auth`
  }

  return `${window.location.origin}/api/auth`
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
})

export async function signInWithProvider(provider: AuthProviderId): Promise<{ error: string | null }> {
  const { error } = await authClient.signIn.social({
    provider,
    callbackURL: window.location.href,
    errorCallbackURL: window.location.href,
  })

  return {
    error: error?.message || null,
  }
}

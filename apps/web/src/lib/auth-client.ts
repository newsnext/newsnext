import { createAuthClient } from "better-auth/react"
import { API_BASE_PATH, API_ORIGIN_URL } from "@/lib/env"

export type AuthProviderId = "github" | "google"

function getAuthRedirectURL(): string {
  const url = new URL(window.location.href)

  url.searchParams.delete("code")
  url.searchParams.delete("error")
  url.searchParams.delete("error_description")
  url.searchParams.delete("state")

  return url.toString()
}

export const authClient = createAuthClient({
  baseURL: API_ORIGIN_URL,
  basePath: `${API_BASE_PATH}/auth`,
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

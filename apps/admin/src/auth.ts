import { createAuthClient } from "better-auth/react"

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

function getAuthBaseURL(): string {
  return API_BASE_URL ? `${API_BASE_URL}/api/auth` : `${window.location.origin}/api/auth`
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
})

export async function signInWithGitHub(): Promise<void> {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: window.location.href,
    errorCallbackURL: window.location.href,
  })
}

export async function signInWithGoogle(): Promise<void> {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: window.location.href,
    errorCallbackURL: window.location.href,
  })
}

import { createAuthClient } from "better-auth/react"

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

export function getAPIURL(path: string): URL {
  return new URL(path, API_BASE_URL || window.location.origin)
}

export const authClient = createAuthClient({
  baseURL: getAPIURL("/api/auth").toString(),
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

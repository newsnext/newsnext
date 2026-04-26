import { createAuthClient } from "better-auth/react"
import { BASE_URL } from "@/lib/env"

function getAuthBaseURL(): string {
  if (BASE_URL) {
    return `${BASE_URL}/api/auth`
  }

  return `${window.location.origin}/api/auth`
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
})

import { createContext, use } from "react"

interface LiveCardIdentity {
  badge?: string
  icon?: string
  name: string
}

export const LiveCardIdentityContext = createContext<LiveCardIdentity | undefined>(undefined)

export function useLiveCardIdentity(): LiveCardIdentity {
  const identity = use(LiveCardIdentityContext)
  if (!identity) throw new Error("LiveCardIdentityContext is missing")
  return identity
}

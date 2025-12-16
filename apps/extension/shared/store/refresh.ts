import { atom } from "jotai"

// Store IDs of sources that are currently refreshing via global refresh
export const refreshingSourcesAtom = atom(new Set<string>())

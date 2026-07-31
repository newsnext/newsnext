import type { $Fetch } from "ofetch"
import { $fetch } from "ofetch"

export const myFetch: $Fetch = $fetch.create({
  credentials: "include",
  timeout: 10000,
  retry: 3,
})

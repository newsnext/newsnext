import type { $Fetch } from "ofetch"
import { $fetch } from "ofetch"

export const myFetch: $Fetch = $fetch.create({
  timeout: 10000,
  retry: 3,
})

import type { $Fetch } from "ofetch"
import { $fetch } from "ofetch"

export const myFetch: $Fetch = $fetch.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
  timeout: 5000,
  retry: 3,
})

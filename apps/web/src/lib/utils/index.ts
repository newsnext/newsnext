import { $fetch } from "ofetch"

export * from "@newsnext/ui/lib/utils"

export const myFetch = $fetch.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
  timeout: 10000,
  retry: 3,
})

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) {
    return path
  }
  if (path.startsWith("/")) {
    return path
  }
  return `/${path}`
}

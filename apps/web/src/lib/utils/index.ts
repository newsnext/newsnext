import { $fetch } from "ofetch"

export * from "@newsnext/ui/lib/utils"

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) {
    return path
  }
  if (path.startsWith("/")) {
    return path
  }
  return `/${path}`
}

export const myFetch = $fetch.create({
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  },
})
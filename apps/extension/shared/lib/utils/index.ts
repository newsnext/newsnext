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

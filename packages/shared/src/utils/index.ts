export function getFavicon(url: string | URL) {
  try {
    const hostname = typeof url === "string" ? new URL(url).hostname : url.hostname
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`
  } catch {
    return undefined
  }
}
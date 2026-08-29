const EXTERNAL_RSS_QUERY_KEYS = [
  "feed",
  "add_feed",
  "url_rss",
  "feed_url",
] as const

type ExternalRssRadarIntent
  = | { feedUrl: string }
    | { message: string }

let pendingExternalRssRadarIntent: ExternalRssRadarIntent | undefined

function readExternalRssFeedInput(search: string): string | null | undefined {
  const value = search.startsWith("?") ? search.slice(1) : search
  const embeddedQueryStart = value.startsWith("/") ? value.indexOf("?") : -1
  const params = new URLSearchParams(
    embeddedQueryStart === -1 ? value : value.slice(embeddedQueryStart + 1),
  )
  let hasInput = false

  for (const key of EXTERNAL_RSS_QUERY_KEYS) {
    if (params.has(key)) hasInput = true
    const value = params.get(key)?.trim()
    if (value) return value
  }

  return hasInput ? null : undefined
}

function parseExternalRssFeedUrl(value: string | null): string {
  if (!value) {
    throw new Error("No RSS feed URL was provided.")
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("The RSS feed URL is invalid.")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The RSS feed URL must use HTTP or HTTPS.")
  }

  return url.href
}

export function stageExternalRssRadarIntent(
  pathname: string,
  search: string,
  hash = "",
): string | undefined {
  const input = readExternalRssFeedInput(search)
  if (input === undefined) return

  try {
    pendingExternalRssRadarIntent = {
      feedUrl: parseExternalRssFeedUrl(input),
    }
  } catch (error) {
    pendingExternalRssRadarIntent = {
      message: error instanceof Error ? error.message : "The RSS feed URL is invalid.",
    }
  }

  const targetHash = hash.startsWith("#/") ? hash : "#/"
  return `${pathname}${targetHash}`
}

export function consumeExternalRssRadarOpenRequest(): ExternalRssRadarIntent | undefined {
  const intent = pendingExternalRssRadarIntent
  pendingExternalRssRadarIntent = undefined
  return intent
}

import type {
  NewsItem,
  SourcePresentationMetadata,
} from "../types"

interface SourceLoaderUrlResult {
  items: NewsItem[]
  metadata?: SourcePresentationMetadata
}

export function parseSourceBaseUrl(value: string, location: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch (error) {
    throw new TypeError(`${location} must be an absolute HTTP(S) URL`, { cause: error })
  }

  if (
    !["http:", "https:"].includes(url.protocol)
    || !url.hostname
    || url.username
    || url.password
  ) {
    throw new TypeError(`${location} must be an absolute HTTP(S) URL without credentials`)
  }

  return url.href
}

export function resolveSourceUrl(value: string, baseUrl: string | undefined): string {
  return baseUrl === undefined ? value : new URL(value, baseUrl).href
}

export function resolveSourceMetadataUrls(
  metadata: SourcePresentationMetadata,
  baseUrl: string | undefined,
): SourcePresentationMetadata {
  if (baseUrl === undefined) return metadata

  const resolved = { ...metadata }
  if (metadata.badge !== undefined) {
    resolved.badge = resolveSourceUrl(metadata.badge, baseUrl)
  }
  if (metadata.home !== undefined) {
    resolved.home = resolveSourceUrl(metadata.home, baseUrl)
  }
  return resolved
}

export function resolveSourceLoaderResultUrls<T extends SourceLoaderUrlResult>(
  result: T,
  baseUrl: string,
): T {
  const resolved = {
    ...result,
    items: result.items.map(item => resolveNewsItemUrls(item, baseUrl)),
  }
  if (result.metadata !== undefined) {
    resolved.metadata = resolveSourceMetadataUrls(result.metadata, baseUrl)
  }
  return resolved
}

function resolveNewsItemUrls(item: NewsItem, baseUrl: string): NewsItem {
  const resolved: NewsItem = {
    ...item,
    url: resolveSourceUrl(item.url, baseUrl),
  }

  if (item.mobileUrl !== undefined) {
    resolved.mobileUrl = resolveSourceUrl(item.mobileUrl, baseUrl)
  }
  if (item.author?.home !== undefined) {
    resolved.author = {
      ...item.author,
      home: resolveSourceUrl(item.author.home, baseUrl),
    }
  }
  if (item.icon !== undefined) {
    resolved.icon = {
      ...item.icon,
      src: resolveSourceUrl(item.icon.src, baseUrl),
    }
  }
  if (item.mark !== undefined) {
    resolved.mark = {
      ...item.mark,
      src: resolveSourceUrl(item.mark.src, baseUrl),
    }
  }
  if (item.content !== undefined) {
    resolved.content = { ...item.content }
    if (item.content.pictures !== undefined) {
      resolved.content.pictures = Array.isArray(item.content.pictures)
        ? item.content.pictures.map(value => resolveSourceUrl(value, baseUrl))
        : resolveSourceUrl(item.content.pictures, baseUrl)
    }
    if (typeof item.content.iframe === "string") {
      resolved.content.iframe = resolveSourceUrl(item.content.iframe, baseUrl)
    } else if (item.content.iframe !== undefined) {
      resolved.content.iframe = { ...item.content.iframe }
      if (typeof item.content.iframe.src === "string") {
        resolved.content.iframe.src = resolveSourceUrl(item.content.iframe.src, baseUrl)
      }
    }
  }

  return resolved
}

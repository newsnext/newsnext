import type {
  NewsItem,
  SourceLoaderOutput,
  SourceLoaderResult,
  SourcePresentationMetadata,
} from "../types"

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

export function resolveSourceLoaderOutputUrls(
  output: SourceLoaderOutput,
  baseUrl: string | undefined,
): SourceLoaderOutput {
  if (baseUrl === undefined) return output

  if (Array.isArray(output)) {
    return output.map(item => resolveNewsItemUrls(item, baseUrl))
  }

  const resolved: SourceLoaderResult = {
    ...output,
    items: output.items.map(item => resolveNewsItemUrls(item, baseUrl)),
  }
  if (output.metadata !== undefined) {
    resolved.metadata = resolveLoaderMetadataUrls(output.metadata, baseUrl)
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
  if (item.inline !== undefined) {
    resolved.inline = { ...item.inline }
    if (item.inline.icon !== undefined) {
      resolved.inline.icon = resolvePicture(item.inline.icon, baseUrl)
    }
    if (Array.isArray(item.inline.mark)) {
      resolved.inline.mark = item.inline.mark.map(value =>
        typeof value === "string" ? value : resolvePicture(value, baseUrl))
    } else if (typeof item.inline.mark === "object") {
      resolved.inline.mark = resolvePicture(item.inline.mark, baseUrl)
    }
  }
  if (item.preview !== undefined) {
    resolved.preview = { ...item.preview }
    if (item.preview.picture !== undefined) {
      resolved.preview.picture = Array.isArray(item.preview.picture)
        ? item.preview.picture.map(value => resolvePicture(value, baseUrl))
        : resolvePicture(item.preview.picture, baseUrl)
    }
    if (typeof item.preview.iframe === "string") {
      resolved.preview.iframe = resolveSourceUrl(item.preview.iframe, baseUrl)
    } else if (item.preview.iframe !== undefined) {
      resolved.preview.iframe = { ...item.preview.iframe }
      if (typeof item.preview.iframe.src === "string") {
        resolved.preview.iframe.src = resolveSourceUrl(item.preview.iframe.src, baseUrl)
      }
    }
  }

  return resolved
}

interface UrlPicture {
  src: string
  href?: string
}

function resolvePicture(
  picture: string | UrlPicture,
  baseUrl: string,
): string | UrlPicture {
  if (typeof picture === "string") {
    return resolveSourceUrl(picture, baseUrl)
  }

  const resolved = {
    ...picture,
    src: resolveSourceUrl(picture.src, baseUrl),
  }
  if (picture.href !== undefined) {
    resolved.href = resolveSourceUrl(picture.href, baseUrl)
  }
  return resolved
}

function resolveLoaderMetadataUrls(
  metadata: SourceLoaderResult["metadata"],
  baseUrl: string,
): SourceLoaderResult["metadata"] {
  if (metadata?.badge === undefined) return metadata
  return {
    ...metadata,
    badge: resolveSourceUrl(metadata.badge, baseUrl),
  }
}

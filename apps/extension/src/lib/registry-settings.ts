import type { SourceRegistry } from "@newsnext/source/utils/source"
import { loadBundledSourceRegistry } from "@newsnext/source/service"
import {
  mergeSourceRegistries,
  parseSourceRegistry,
  SOURCE_REGISTRY_LIMITS,
} from "@newsnext/source/utils/source"
import { browser } from "#imports"

export const REGISTRY_URLS_STORAGE_KEY = "newsnext-registry-urls"
export const REGISTRY_CACHE_STORAGE_KEY = "newsnext-registry-cache"
export const MAX_REGISTRY_URLS = 10

export interface RegistryValidationResult {
  sourceCount?: number
  error?: string
  retained?: boolean
  url: string
}

interface StoredRegistryEntry {
  registry: SourceRegistry
  updatedAt: number
}

interface StoredRegistryCache {
  entries: Record<string, StoredRegistryEntry>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeRegistryUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:") {
      return undefined
    }
    url.hash = ""
    return url.toString()
  } catch {
    return undefined
  }
}

export function normalizeRegistryUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(
    value
      .filter(item => typeof item === "string")
      .map(normalizeRegistryUrl)
      .filter(url => url !== undefined),
  )].slice(0, MAX_REGISTRY_URLS)
}

export async function readRegistryUrls(): Promise<string[]> {
  const stored = await browser.storage.local.get(REGISTRY_URLS_STORAGE_KEY)
  return normalizeRegistryUrls(stored[REGISTRY_URLS_STORAGE_KEY])
}

export async function writeRegistryUrls(urls: string[]): Promise<string[]> {
  const normalized = normalizeRegistryUrls(urls)
  await browser.storage.local.set({ [REGISTRY_URLS_STORAGE_KEY]: normalized })
  return normalized
}

async function readRegistryCache(): Promise<StoredRegistryCache> {
  const stored = await browser.storage.local.get(REGISTRY_CACHE_STORAGE_KEY)
  const value = stored[REGISTRY_CACHE_STORAGE_KEY]
  if (!isRecord(value) || !isRecord(value.entries)) {
    return { entries: {} }
  }

  const entries = Object.fromEntries(
    Object.entries(value.entries).flatMap(([url, entry]) => {
      const normalizedUrl = normalizeRegistryUrl(url)
      if (
        !normalizedUrl
        || !isRecord(entry)
        || typeof entry.updatedAt !== "number"
      ) {
        return []
      }

      try {
        return [[normalizedUrl, {
          registry: parseSourceRegistry(entry.registry),
          updatedAt: entry.updatedAt,
        } satisfies StoredRegistryEntry]]
      } catch {
        return []
      }
    }),
  )

  return { entries }
}

async function writeRegistryCache(cache: StoredRegistryCache): Promise<void> {
  await browser.storage.local.set({ [REGISTRY_CACHE_STORAGE_KEY]: cache })
}

export async function requestRegistryUrlPermissions(urls: string[]): Promise<boolean> {
  const origins = normalizeRegistryUrls(urls).map(url => `${new URL(url).origin}/*`)
  if (origins.length === 0) {
    return true
  }
  return browser.permissions.request({ origins }).catch(() => false)
}

export async function fetchSourceRegistry(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<SourceRegistry> {
  const normalizedUrl = normalizeRegistryUrl(url)
  if (!normalizedUrl) {
    throw new Error("Registry URL must use HTTPS")
  }

  const response = await fetcher(normalizedUrl, {
    cache: "no-cache",
    headers: {
      Accept: "application/json",
    },
  })
  if (!response.ok) {
    throw new Error(`Registry request failed with status ${response.status}`)
  }

  const declaredLength = Number(response.headers.get("content-length"))
  if (
    Number.isFinite(declaredLength)
    && declaredLength > SOURCE_REGISTRY_LIMITS.maxBytes
  ) {
    throw new Error(`Registry exceeds ${SOURCE_REGISTRY_LIMITS.maxBytes} bytes`)
  }

  const body = await response.text()
  if (new TextEncoder().encode(body).byteLength > SOURCE_REGISTRY_LIMITS.maxBytes) {
    throw new Error(`Registry exceeds ${SOURCE_REGISTRY_LIMITS.maxBytes} bytes`)
  }

  try {
    return parseSourceRegistry(JSON.parse(body))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid registry JSON"
    throw new Error(message, { cause: error })
  }
}

export async function updateConfiguredSourceRegistries(
  fetcher: typeof fetch = fetch,
): Promise<RegistryValidationResult[]> {
  const [urls, previousCache] = await Promise.all([
    readRegistryUrls(),
    readRegistryCache(),
  ])
  const updatedAt = Date.now()
  const updates = await Promise.all(
    urls.map(async (url) => {
      try {
        const registry = await fetchSourceRegistry(url, fetcher)
        return {
          entry: { registry, updatedAt } satisfies StoredRegistryEntry,
          result: {
            sourceCount: Object.keys(registry).length,
            url,
          } satisfies RegistryValidationResult,
        }
      } catch (error) {
        return {
          entry: previousCache.entries[url],
          result: {
            error: error instanceof Error ? error.message : "Registry update failed",
            retained: previousCache.entries[url] !== undefined,
            url,
          } satisfies RegistryValidationResult,
        }
      }
    }),
  )

  const entries = Object.fromEntries(
    updates.flatMap(({ entry }, index) => entry ? [[urls[index], entry]] : []),
  )
  await writeRegistryCache({ entries })
  return updates.map(update => update.result)
}

export async function loadConfiguredSourceRegistry(): Promise<SourceRegistry> {
  const [bundled, urls, cache] = await Promise.all([
    loadBundledSourceRegistry(),
    readRegistryUrls(),
    readRegistryCache(),
  ])
  const remoteRegistries = urls.flatMap((url) => {
    const entry = cache.entries[url]
    return entry ? [entry.registry] : []
  })

  return mergeSourceRegistries(bundled, ...remoteRegistries)
}

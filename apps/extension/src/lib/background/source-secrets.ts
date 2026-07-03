import type { RegisteredSourceDefinition, SourceSecretDefinition, SourceSecrets } from "@newsnext/client-source/typings"
import { browser } from "wxt/browser"

const DEFAULT_LOCAL_STORAGE_SECRET_CACHE_STORAGE_KEY = "newsnext_source_secrets"
type SourceSecretCache = Record<string, Record<string, string>>

function parseSourceSecretCache(storedValue: unknown): SourceSecretCache | undefined {
  let cache: unknown = storedValue

  if (typeof storedValue === "string") {
    try {
      cache = JSON.parse(storedValue) as unknown
    } catch {
      cache = undefined
    }
  }

  return cache && typeof cache === "object"
    ? cache as SourceSecretCache
    : undefined
}

async function readSourceSecretCache(): Promise<SourceSecretCache | undefined> {
  const items = await browser.storage.local.get(DEFAULT_LOCAL_STORAGE_SECRET_CACHE_STORAGE_KEY).catch(() => undefined)
  return parseSourceSecretCache(items?.[DEFAULT_LOCAL_STORAGE_SECRET_CACHE_STORAGE_KEY])
}

async function readLocalStorageSecret(secret: SourceSecretDefinition & { type: "localStorage" }): Promise<string | undefined> {
  const [tab] = await browser.tabs.query({ url: `${secret.origin.replace(/\/$/, "")}/*` }).catch(() => [])
  if (typeof tab?.id !== "number") {
    return undefined
  }

  const [executionResult] = await browser.scripting.executeScript<[string], string | null>({
    target: { tabId: tab.id },
    args: [secret.itemKey],
    func: itemKey => globalThis.localStorage?.getItem(itemKey) ?? null,
  }).catch(() => [])

  const value = executionResult?.result
  return typeof value === "string" ? value.trim() || undefined : undefined
}

export async function resolveSourceSecrets(
  source: Pick<RegisteredSourceDefinition, "secrets">,
  provider?: string,
): Promise<SourceSecrets> {
  const secretDefinitions = source.secrets
  if (!secretDefinitions?.length) {
    return {}
  }

  const cache = await readSourceSecretCache()
  const providerCache = provider && cache && typeof cache === "object"
    ? (cache as Record<string, unknown>)[provider]
    : undefined
  const cachedSecrets = providerCache && typeof providerCache === "object"
    ? providerCache as Record<string, unknown>
    : undefined

  const entries = await Promise.all(
    (secretDefinitions ?? []).map(async (secret) => {
      const cachedSecret = "cache" in secret && secret.cache === false
        ? undefined
        : cachedSecrets?.[secret.key]

      if (typeof cachedSecret === "string" && cachedSecret.trim()) {
        return [secret.key, cachedSecret.trim()] as const
      }

      if (secret.type === "cookie") {
        const cookie = await browser.cookies.get({ url: secret.origin, name: secret.itemKey }).catch(() => undefined)
        return [secret.key, cookie?.value] as const
      }

      return [
        secret.key,
        await readLocalStorageSecret(secret),
      ] as const
    }),
  )

  return Object.fromEntries(entries)
}

export async function updateSourceSecrets(
  source: Pick<RegisteredSourceDefinition, "secrets">,
  provider: string,
  secrets: SourceSecrets,
): Promise<void> {
  const cacheableKeys = new Set(
    (source.secrets ?? [])
      .filter(secret => !("cache" in secret) || secret.cache !== false)
      .map(secret => secret.key),
  )

  if (!provider || cacheableKeys.size === 0) {
    return
  }

  const updates = Object.fromEntries(
    Object.entries(secrets)
      .filter((entry): entry is [string, string] => {
        const [key, value] = entry
        return cacheableKeys.has(key) && typeof value === "string" && value.trim().length > 0
      })
      .map(([key, value]) => [key, value.trim()]),
  )

  if (!Object.keys(updates).length) {
    return
  }

  const cache = await readSourceSecretCache() ?? {}
  const providerCache = cache[provider] ?? {}

  await browser.storage.local.set({
    [DEFAULT_LOCAL_STORAGE_SECRET_CACHE_STORAGE_KEY]: JSON.stringify({
      ...cache,
      [provider]: {
        ...providerCache,
        ...updates,
      },
    }),
  }).catch(() => undefined)
}

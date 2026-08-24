import type { RuntimeSource, SourceSecretDefinition, SourceSecrets } from "@newsnext/source-kit/types"
import { SourceLoginRequiredError } from "@newsnext/source-kit/core"
import { storage } from "wxt/utils/storage"
import { browser } from "#imports"
import { PERSISTED_DATA_SLICES } from "../settings/persisted-data"

type SourceSecretCache = Record<string, Record<string, string>>
const SOURCE_SECRET_CACHE_STORAGE_KEY = `local:${PERSISTED_DATA_SLICES.secrets.key}` as const

function parseSourceSecretCache(storedValue: unknown): SourceSecretCache | undefined {
  return storedValue && typeof storedValue === "object"
    ? storedValue as SourceSecretCache
    : undefined
}

async function readSourceSecretCache(): Promise<SourceSecretCache | undefined> {
  const cache = await storage.getItem<SourceSecretCache>(SOURCE_SECRET_CACHE_STORAGE_KEY).catch(() => undefined)
  return parseSourceSecretCache(cache)
}

async function writeSourceSecretCache(cache: SourceSecretCache): Promise<void> {
  await storage.setItem(SOURCE_SECRET_CACHE_STORAGE_KEY, cache)
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

function assertRequiredSecretsResolved(secretDefinitions: SourceSecretDefinition[], secrets: SourceSecrets): void {
  const missingSecret = secretDefinitions.find(secret => secret.required !== false && !secrets[secret.key]?.trim())
  if (!missingSecret) {
    return
  }

  throw new SourceLoginRequiredError(missingSecret.origin)
}

export async function resolveSourceSecrets(
  source: Pick<RuntimeSource, "secrets">,
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

  const secrets = Object.fromEntries(entries)
  assertRequiredSecretsResolved(secretDefinitions, secrets)

  if (provider) {
    await updateSourceSecrets(source, provider, secrets)
  }

  return secrets
}

export async function updateSourceSecrets(
  source: Pick<RuntimeSource, "secrets">,
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
  const providerCache = cache[provider] && typeof cache[provider] === "object"
    ? cache[provider]
    : {}

  const hasChanges = Object.entries(updates).some(([key, value]) => providerCache[key] !== value)
  if (!hasChanges) {
    return
  }

  await writeSourceSecretCache({
    ...cache,
    [provider]: {
      ...providerCache,
      ...updates,
    },
  }).catch(() => undefined)
}
